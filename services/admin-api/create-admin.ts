import { prisma } from './src/lib/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

async function createAdminUser() {
  try {
    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@test.com' },
    })

    if (existingAdmin) {
      console.log('Admin user already exists')
      console.log('Email: admin@test.com')
      console.log('Role:', existingAdmin.role)
      
      // Generate token
      const token = jwt.sign(
        {
          userId: existingAdmin.id,
          email: existingAdmin.email,
          username: existingAdmin.username,
          role: existingAdmin.role,
        },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '1h' }
      )
      console.log('\nToken:', token)
      return
    }

    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        username: 'admin',
        passwordHash,
        role: 'admin',
        isActive: true,
      },
    })

    console.log('Admin user created successfully!')
    console.log('ID:', admin.id)
    console.log('Email: admin@test.com')
    console.log('Password: admin123')
    console.log('Role:', admin.role)

    // Generate token
    const token = jwt.sign(
      {
        userId: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '1h' }
    )
    console.log('\nToken:', token)

    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

createAdminUser()
