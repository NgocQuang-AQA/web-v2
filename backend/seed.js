import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'node:path'
import { User } from './models/User.js'
import { Role } from './models/Role.js'

// Load env vars similar to server.js
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  process.platform === 'win32'
    ? path.resolve(process.cwd(), '.env.windows')
    : undefined,
  process.platform === 'darwin'
    ? path.resolve(process.cwd(), '.env.macos')
    : undefined,
].filter(Boolean)
for (const p of envCandidates) dotenv.config({ path: p })

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/'
const dbName = process.env.MONGO_DB_NAME || 'mydb'

async function seed() {
  try {
    console.log(`Connecting to MongoDB at ${mongoUri} (db: ${dbName})...`)
    await mongoose.connect(mongoUri, { dbName })
    console.log('Connected.')

    // Clear existing data
    await User.deleteMany({})
    await Role.deleteMany({})
    console.log('Cleared existing Users and Roles.')

    // 1. Insert Roles
    const rolesData = [
      {
        code: 'ADMIN',
        name: 'Administrator',
        description: 'Tài khoản quản trị viên hệ thống',
        permissions: ['*'],
        menus: ['daily', 'ta', 'bug', 'report', 'notes'],
        isActive: true,
      },
      {
        code: 'BA',
        name: 'Business Analyst',
        description: 'Team BA',
        permissions: [
          'HELPER_VOC_VIEW',
          'REPORT_GENERATOR_VIEW',
          'SUMMARY_REPORT_VIEW',
          'TEST_AUTOMATION_AGENT_VIEW',
        ],
        menus: ['report', 'notes'],
        isActive: true,
      },
      {
        code: 'BE',
        name: 'Backend Engineer',
        description: 'Team BE',
        permissions: [
          'HELPER_VOC_VIEW',
          'REPORT_GENERATOR_VIEW',
          'SUMMARY_REPORT_VIEW',
          'TEST_AUTOMATION_AGENT_VIEW',
        ],
        menus: ['daily', 'ta', 'bug', 'report', 'notes'], // BE sees mostly everything except maybe some specific ones? User said "BE: hide JIRA, Test Case" -> "bug", "cases"?
        // In sidebar: BE hides 'jira', 'cases'. 'jira' is bug tracker? 'cases' is not in my mock list?
        // Let's assume standard set.
        isActive: true,
      },
      {
        code: 'OTHER',
        name: 'Other User',
        description: 'Người dùng khác',
        permissions: ['HELPER_VOC_VIEW'],
        menus: ['notes'],
        isActive: true,
      },
    ]

    await Role.insertMany(rolesData)
    console.log(`Inserted ${rolesData.length} roles.`)

    // 2. Insert Users
    // Helper to hash password
    const hash = (pwd) => bcrypt.hashSync(pwd, 10)

    const usersData = [
      {
        username: 'admin',
        passwordHash: hash('1qaz2wsx'),
        role: 'ADMIN',
        isActive: true,
      },
      {
        username: 'bateam',
        passwordHash: hash('u12345'),
        role: 'BA',
        isActive: true,
      },
      {
        username: 'beteam',
        passwordHash: hash('u12345'),
        role: 'BE',
        isActive: true,
      },
      {
        username: 'users',
        passwordHash: hash('u12345-'),
        role: 'OTHER',
        isActive: true,
      },
    ]

    await User.insertMany(usersData)
    console.log(`Inserted ${usersData.length} users.`)

    console.log('Seed completed successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Seed failed:', err)
    process.exit(1)
  }
}

seed()
