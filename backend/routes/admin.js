import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { Role } from '../models/Role.js'

export function createAdminRouter() {
  const router = Router()

  // --- USERS ---

  router.get('/users', async (req, res) => {
    try {
      const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 })
      res.json(users)
    } catch (e) {
      res.status(500).json({ message: 'internal_error' })
    }
  })

  router.post('/users', async (req, res) => {
    try {
      const { username, password, role } = req.body
      if (!username || !password || !role) {
        return res.status(400).json({ message: 'missing_fields' })
      }
      const existing = await User.findOne({ username })
      if (existing) return res.status(400).json({ message: 'username_exists' })

      const passwordHash = await bcrypt.hash(password, 10)
      const newUser = new User({ username, passwordHash, role, isActive: true })
      await newUser.save()

      const { passwordHash: _, ...u } = newUser.toObject()
      res.status(201).json(u)
    } catch (e) {
      console.error(e)
      res.status(500).json({ message: 'internal_error' })
    }
  })

  router.patch('/users/:id/status', async (req, res) => {
    try {
      const { isActive } = req.body
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
      ).select('-passwordHash')
      if (!user) return res.status(404).json({ message: 'not_found' })
      res.json(user)
    } catch (e) {
      res.status(500).json({ message: 'internal_error' })
    }
  })

  // --- ROLES ---

  router.get('/roles', async (req, res) => {
    try {
      const roles = await Role.find({}).sort({ code: 1 })
      res.json(roles)
    } catch (e) {
      res.status(500).json({ message: 'internal_error' })
    }
  })

  router.post('/roles', async (req, res) => {
    try {
      const { code, name, description, permissions, menus } = req.body
      if (!code) return res.status(400).json({ message: 'missing_code' })

      const existing = await Role.findOne({ code })
      if (existing) return res.status(400).json({ message: 'role_exists' })

      const newRole = new Role({
        code,
        name,
        description,
        permissions,
        menus,
        isActive: true,
      })
      await newRole.save()
      res.status(201).json(newRole)
    } catch (e) {
      res.status(500).json({ message: 'internal_error' })
    }
  })

  router.patch('/roles/:id', async (req, res) => {
    try {
      const { name, description, permissions, menus, isActive } = req.body
      const role = await Role.findById(req.params.id)
      if (!role) return res.status(404).json({ message: 'not_found' })

      if (name !== undefined) role.name = name
      if (description !== undefined) role.description = description
      if (permissions !== undefined) role.permissions = permissions
      if (menus !== undefined) role.menus = menus

      if (isActive !== undefined) {
        role.isActive = isActive
        if (isActive === false) {
          // Deactivate role -> move users to OTHER
          await User.updateMany({ role: role.code }, { role: 'OTHER' })
        }
      }

      await role.save()
      res.json(role)
    } catch (e) {
      console.error(e)
      res.status(500).json({ message: 'internal_error' })
    }
  })

  return router
}
