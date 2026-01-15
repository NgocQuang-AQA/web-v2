import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import PerformanceTest from '../models/PerformanceTest.js';
import { Notice } from '../models/Notice.js';
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

    const idxElapsed = headers.indexOf('elapsed');
    const idxSuccess = headers.indexOf('success');
    const idxTimestamp = headers.indexOf('timeStamp');
    const idxLabel = headers.indexOf('label');
    const idxRespCode = headers.indexOf('responseCode');
    const idxRespMsg = headers.indexOf('responseMessage');
    const idxFailureMsg = headers.indexOf('failureMessage');
    const idxUrl = headers.indexOf('URL');

    const iElapsed = idxElapsed !== -1 ? idxElapsed : 1;
    const iSuccess = idxSuccess !== -1 ? idxSuccess : 7;
    const iTimestamp = idxTimestamp !== -1 ? idxTimestamp : 0;
    const iLabel = idxLabel !== -1 ? idxLabel : 2;
    const iRespCode = idxRespCode !== -1 ? idxRespCode : 3;
    const iRespMsg = idxRespMsg !== -1 ? idxRespMsg : 4;
    const iFailureMsg = idxFailureMsg !== -1 ? idxFailureMsg : 8;
    const iUrl = idxUrl !== -1 ? idxUrl : 13;

    let totalSamples = 0;
    let totalElapsed = 0;
    let errorCount = 0;
    let minTime = Infinity;
    let maxTime = 0;
    let errorSample = null;

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < headers.length) continue;

        const elapsed = parseInt(cols[iElapsed]) || 0;
        const respCodeRaw = cols[iRespCode] || '';
        const respCodeNum = parseInt(respCodeRaw, 10);
        const isFail = Number.isFinite(respCodeNum) ? respCodeNum !== 200 : String(respCodeRaw).trim() !== '200';
        const timestamp = parseInt(cols[iTimestamp]) || 0;

        totalSamples++;
        totalElapsed += elapsed;
        if (isFail) {
          errorCount++;
          if (!errorSample) {
            errorSample = {
              responseCode: cols[iRespCode] || '',
              responseMessage: cols[iRespMsg] || '',
              failureMessage: cols[iFailureMsg] || '',
              url: cols[iUrl] || '',
              label: cols[iLabel] || ''
            };
          }
        }
        
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
        throughput: parseFloat(throughput.toFixed(2)),
        errorSample: errorSample
    };

  } catch (e) {
    console.error("Error parsing JTL:", e);
    return { error: "Failed to parse results" };
  }
};

const parseJTLRows = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { total: 0, items: [] };
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    if (lines.length < 2) return { total: 0, items: [] };
    const headers = lines[0].split(',');
    const indexOf = (name, fallback) => {
      const idx = headers.indexOf(name);
      return idx !== -1 ? idx : fallback;
    };
    const iTimestamp = indexOf('timeStamp', 0);
    const iElapsed = indexOf('elapsed', 1);
    const iLabel = indexOf('label', 2);
    const iRespCode = indexOf('responseCode', 3);
    const iRespMsg = indexOf('responseMessage', 4);
    const iThread = indexOf('threadName', 5);
    const iDataType = indexOf('dataType', 6);
    const iSuccess = indexOf('success', 7);
    const iFailureMsg = indexOf('failureMessage', 8);
    const iBytes = indexOf('bytes', 9);
    const iSentBytes = indexOf('sentBytes', 10);
    const iGrpThreads = indexOf('grpThreads', 11);
    const iAllThreads = indexOf('allThreads', 12);
    const iUrl = indexOf('URL', 13);
    const iLatency = indexOf('Latency', 14);
    const iIdle = indexOf('IdleTime', 15);
    const iConnect = indexOf('Connect', 16);
    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < headers.length) continue;
      const respCodeRaw = cols[iRespCode] || '';
      const respCodeNum = parseInt(respCodeRaw, 10);
      const isFail = Number.isFinite(respCodeNum) ? respCodeNum !== 200 : String(respCodeRaw).trim() !== '200';
      items.push({
        timeStamp: parseInt(cols[iTimestamp]) || 0,
        elapsed: parseInt(cols[iElapsed]) || 0,
        label: cols[iLabel] || '',
        responseCode: cols[iRespCode] || '',
        responseMessage: cols[iRespMsg] || '',
        threadName: cols[iThread] || '',
        dataType: cols[iDataType] || '',
        success: (cols[iSuccess] === 'true' || cols[iSuccess] === 'TRUE'),
        failureMessage: cols[iFailureMsg] || '',
        bytes: parseInt(cols[iBytes]) || 0,
        sentBytes: parseInt(cols[iSentBytes]) || 0,
        grpThreads: parseInt(cols[iGrpThreads]) || 0,
        allThreads: parseInt(cols[iAllThreads]) || 0,
        url: cols[iUrl] || '',
        latency: parseInt(cols[iLatency]) || 0,
        idleTime: parseInt(cols[iIdle]) || 0,
        connect: parseInt(cols[iConnect]) || 0,
        isFail
      });
    }
    return { total: items.length, items };
  } catch (e) {
    console.error("Error parsing JTL rows:", e);
    return { total: 0, items: [] };
  }
};
// --- API Endpoints ---

// Run a new test
router.post('/run', async (req, res) => {
  try {
    const { apiName, method, headers, body, token, requestConfig, jmeterConfig } = req.body;
    const reqCfg = requestConfig || { headers, body, token };

    // 1. Create DB Record
    const testRecord = new PerformanceTest({
        apiName,
        method,
        targetUrl: `${jmeterConfig.protocol}://${jmeterConfig.host}:${jmeterConfig.port}${jmeterConfig.path}`,
        requestConfig: reqCfg,
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
            const hdrs = reqCfg?.headers || {};
            if (hdrs) {
                for (const [key, value] of Object.entries(hdrs)) {
                    headersXml += `
                    <elementProp name="" elementType="Header">
                      <stringProp name="Header.name">${key}</stringProp>
                      <stringProp name="Header.value">${value}</stringProp>
                    </elementProp>`;
                }
            }
            const tokenVal = reqCfg?.token || token;
            if (tokenVal) {
                 headersXml += `
                    <elementProp name="" elementType="Header">
                      <stringProp name="Header.name">Authorization</stringProp>
                      <stringProp name="Header.value">${tokenVal}</stringProp>
                    </elementProp>`;
            }

            // Build Body
            // Escape JSON for XML inclusion
            const bodyPayload = reqCfg?.body ?? body;
            const bodyStr = bodyPayload
              ? JSON.stringify(bodyPayload)
                  .replace(/"/g, '&quot;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
              : '';

            const safePath = (jmeterConfig.path || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            // Replace Placeholders
            templateContent = templateContent
                .replace(/__THREADS__/g, jmeterConfig.threads)
                .replace(/__RAMPUP__/g, jmeterConfig.rampUp)
                .replace(/__LOOPS__/g, jmeterConfig.loop)
                .replace(/__PROTOCOL__/g, jmeterConfig.protocol || 'https')
                .replace(/__HOST__/g, jmeterConfig.host)
                .replace(/__PORT__/g, jmeterConfig.port || 443)
                .replace(/__PATH__/g, safePath)
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
                        try {
                          const s = testRecord.summary || {};
                          const samples = s?.samples || 0;
                          const avg = s?.avg || 0;
                          const errRate = s?.errorRate || 0;
                          const percent = Math.round(Number(errRate) * 100);
                          const content = `Performance Test "${testRecord.apiName}" completed: ${samples} samples, avg ${avg}ms, error ${percent}%`;
                          const doc = new Notice({ content, time: new Date(), namepath: testRecord.targetUrl });
                          await doc.save();
                        } catch (e) {
                          console.error('Failed to create notice for performance test:', e);
                        }
                    }
                    await testRecord.save();
                    // Cleanup JMX file if needed
                    // fs.unlinkSync(runJmxPath);
                });
            } else {
                console.error(`[ERROR] JMeter not found. Performance test ${testRecord._id} cannot be executed without JMeter.`);
                testRecord.status = 'FAILED';
                testRecord.errorMessage = 'JMeter is not installed or not available in PATH';
                await testRecord.save();
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

router.get('/:id/results', async (req, res) => {
  try {
    const test = await PerformanceTest.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    const fp = test.resultFilePath;
    if (!fp || !fs.existsSync(fp)) return res.json({ total: 0, items: [] });
    const rows = parseJTLRows(fp);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// List tests with pagination
router.get('/', async (req, res) => {
    try {
        const { page = 1, pageSize = 20 } = req.query;
        const p = Math.max(1, Number(page) || 1);
        const s = Math.max(1, Math.min(100, Number(pageSize) || 20));
        const total = await PerformanceTest.countDocuments();
        const items = await PerformanceTest.find()
            .sort({ createdAt: -1 })
            .skip((p - 1) * s)
            .limit(s);
        res.json({ total, items });
    } catch (e) {
        res.status(500).json({error: e.message});
    }
});

export default router;
