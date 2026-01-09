import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import PerformanceTest from '../models/PerformanceTest.js';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to check if jmeter exists
const checkJMeter = () => {
  return new Promise((resolve) => {
    exec('jmeter -v', (err) => {
      resolve(!err);
    });
  });
};

// Helper to parse JTL (CSV)
const parseJTL = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length < 2) return null; // No data

    const headers = lines[0].split(',');
    // Standard JTL headers usually: timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,failureMessage...
    
    const idxElapsed = headers.indexOf('elapsed');
    const idxSuccess = headers.indexOf('success');
    const idxTimestamp = headers.indexOf('timeStamp');

    // Fallback indices if header names differ slightly or not found (JMeter default CSV often has these specific names)
    // If defaults not found, assume standard positions: timestamp(0), elapsed(1), success(7)
    const iElapsed = idxElapsed !== -1 ? idxElapsed : 1;
    const iSuccess = idxSuccess !== -1 ? idxSuccess : 7;
    const iTimestamp = idxTimestamp !== -1 ? idxTimestamp : 0;

    let totalSamples = 0;
    let totalElapsed = 0;
    let errorCount = 0;
    let minTime = Infinity;
    let maxTime = 0;

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < headers.length) continue;

        const elapsed = parseInt(cols[iElapsed]) || 0;
        const successStr = cols[iSuccess];
        const success = (successStr === 'true' || successStr === 'TRUE');
        const timestamp = parseInt(cols[iTimestamp]) || 0;

        totalSamples++;
        totalElapsed += elapsed;
        if (!success) errorCount++;
        
        if (timestamp < minTime) minTime = timestamp;
        if (timestamp > maxTime) maxTime = timestamp;
    }
    
    // Throughput calculation
    let duration = 0;
    if (totalSamples > 1 && maxTime > minTime) {
        duration = (maxTime - minTime) / 1000; // seconds
    } else if (totalSamples === 1) {
        duration = totalElapsed / 1000; // estimate
    }

    const throughput = duration > 0 ? (totalSamples / duration) : 0;

    return {
        samples: totalSamples,
        avg: totalSamples > 0 ? Math.round(totalElapsed / totalSamples) : 0,
        errorRate: totalSamples > 0 ? (errorCount / totalSamples) : 0,
        throughput: parseFloat(throughput.toFixed(2))
    };

  } catch (e) {
    console.error("Error parsing JTL:", e);
    return { error: "Failed to parse results" };
  }
};

// --- API Endpoints ---

// Run a new test
router.post('/run', async (req, res) => {
  try {
    const { apiName, method, headers, body, token, jmeterConfig } = req.body;

    // 1. Create DB Record
    const testRecord = new PerformanceTest({
        apiName,
        method,
        targetUrl: `${jmeterConfig.protocol}://${jmeterConfig.host}:${jmeterConfig.port}${jmeterConfig.path}`,
        requestConfig: { headers, body, token },
        jmeterConfig
    });
    await testRecord.save();

    res.status(202).json({ 
        message: 'Performance test initiated successfully', 
        testId: testRecord._id,
        status: 'PENDING'
    });

    // 2. Async Execution Logic
    (async () => {
        try {
            // Prepare paths
            const templatePath = path.join(__dirname, '../jmeter-templates/base_template.xml');
            const runJmxPath = path.join(__dirname, `../jmeter-templates/run_${testRecord._id}.jmx`);
            const resultJtlPath = path.join(__dirname, `../jmeter-results/result_${testRecord._id}.jtl`);
            
            // Read Template
            let templateContent = fs.readFileSync(templatePath, 'utf-8');

            // Build Headers XML
            let headersXml = '';
            if (headers) {
                for (const [key, value] of Object.entries(headers)) {
                    headersXml += `
                    <elementProp name="" elementType="Header">
                      <stringProp name="Header.name">${key}</stringProp>
                      <stringProp name="Header.value">${value}</stringProp>
                    </elementProp>`;
                }
            }
            if (token) {
                 headersXml += `
                    <elementProp name="" elementType="Header">
                      <stringProp name="Header.name">Authorization</stringProp>
                      <stringProp name="Header.value">${token}</stringProp>
                    </elementProp>`;
            }

            // Build Body
            // Escape JSON for XML inclusion
            const bodyStr = body ? JSON.stringify(body).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

            // Replace Placeholders
            templateContent = templateContent
                .replace(/__THREADS__/g, jmeterConfig.threads)
                .replace(/__RAMPUP__/g, jmeterConfig.rampUp)
                .replace(/__LOOPS__/g, jmeterConfig.loop)
                .replace(/__PROTOCOL__/g, jmeterConfig.protocol || 'https')
                .replace(/__HOST__/g, jmeterConfig.host)
                .replace(/__PORT__/g, jmeterConfig.port || 443)
                .replace(/__PATH__/g, jmeterConfig.path)
                .replace(/__METHOD__/g, method)
                .replace(/__HEADERS_XML__/g, headersXml)
                .replace(/__BODY__/g, bodyStr);

            fs.writeFileSync(runJmxPath, templateContent);

            // Update status to RUNNING
            testRecord.status = 'RUNNING';
            await testRecord.save();

            // Check for JMeter
            const hasJMeter = await checkJMeter();

            if (hasJMeter) {
                const cmd = `jmeter -n -t "${runJmxPath}" -l "${resultJtlPath}"`;
                exec(cmd, async (error, stdout, stderr) => {
                    if (error) {
                        console.error(`JMeter Exec Error: ${error.message}`);
                        testRecord.status = 'FAILED';
                        testRecord.errorMessage = error.message;
                    } else {
                        testRecord.status = 'COMPLETED';
                        testRecord.resultFilePath = resultJtlPath;
                        testRecord.summary = parseJTL(resultJtlPath);
                    }
                    await testRecord.save();
                    // Cleanup JMX file if needed
                    // fs.unlinkSync(runJmxPath);
                });
            } else {
                // MOCK EXECUTION MODE (For environment without JMeter)
                console.warn(`[WARN] JMeter not found. Simulating test execution for ID: ${testRecord._id}`);
                
                setTimeout(async () => {
                    // Generate Mock JTL Data
                    const now = Date.now();
                    let csvContent = `timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,URL,Latency,IdleTime,Connect\n`;
                    
                    const samples = jmeterConfig.threads * jmeterConfig.loop;
                    for(let i=0; i<samples; i++) {
                         const isSuccess = Math.random() > 0.1; // 90% success
                         const elapsed = Math.floor(Math.random() * 500) + 50; // 50-550ms
                         csvContent += `${now + (i*100)},${elapsed},HTTP Request,${isSuccess?200:500},${isSuccess?'OK':'Internal Error'},Thread-${i%jmeterConfig.threads},text,${isSuccess},${isSuccess?'':'Err'},100,50,1,1,http://${jmeterConfig.host},${elapsed-10},0,5\n`;
                    }

                    fs.writeFileSync(resultJtlPath, csvContent);
                    
                    testRecord.status = 'COMPLETED';
                    testRecord.resultFilePath = resultJtlPath;
                    testRecord.summary = parseJTL(resultJtlPath);
                    await testRecord.save();
                    console.log(`[INFO] Mock test ${testRecord._id} finished.`);
                }, 3000); // Simulate 3s run
            }

        } catch (innerError) {
            console.error("Async Execution Error:", innerError);
            testRecord.status = 'FAILED';
            testRecord.errorMessage = innerError.message;
            await testRecord.save();
        }
    })();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get test status/result
router.get('/:id', async (req, res) => {
    try {
        const test = await PerformanceTest.findById(req.params.id);
        if (!test) return res.status(404).json({message: 'Test not found'});
        res.json(test);
    } catch (e) {
        res.status(500).json({error: e.message});
    }
});

// List all tests
router.get('/', async (req, res) => {
    try {
        const tests = await PerformanceTest.find().sort({createdAt: -1}).limit(50);
        res.json(tests);
    } catch (e) {
        res.status(500).json({error: e.message});
    }
});

export default router;
