import bcrypt from 'bcryptjs';
import pool from '../src/config/database.js';

async function seedAdminUsers() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashAdmin123 = await bcrypt.hash('admin123', salt);
        const hashAdminSecure = await bcrypt.hash('Admin@2026#Secure', salt);

        const usersToSeed = [
            { username: 'Super Admin', email: 'admin@chandraprecision.com', hash: hashAdminSecure, role: 'super_admin' },
            { username: 'Super Admin', email: 'admin@yourdomain.com', hash: hashAdminSecure, role: 'super_admin' },
            { username: 'Demo Admin', email: 'admin@gmail.com', hash: hashAdmin123, role: 'super_admin' },
            { username: 'Plant Manager', email: 'manager@chandraprecision.com', hash: hashAdmin123, role: 'manager' },
            { username: 'Floor Operator', email: 'operator@chandraprecision.com', hash: hashAdmin123, role: 'operator' },
        ];

        for (const u of usersToSeed) {
            await pool.query(`
                INSERT INTO users (username, email, password_hash, role, company_code, is_active)
                VALUES ($1, $2, $3, $4, 'CO-0001', true)
                ON CONFLICT (email) DO UPDATE 
                SET password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    is_active = true,
                    updated_at = NOW()
            `, [u.username, u.email, u.hash, u.role]);
        }

        console.log('✅ Seeded/Updated verified credentials for standard admin and role accounts:');
        console.log('   - admin@chandraprecision.com / Admin@2026#Secure (Super Admin)');
        console.log('   - admin@gmail.com / admin123 (Super Admin)');
        console.log('   - admin@yourdomain.com / Admin@2026#Secure (Super Admin)');
        console.log('   - manager@chandraprecision.com / admin123 (Manager)');
        console.log('   - operator@chandraprecision.com / admin123 (Operator)');

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding users:', err);
        process.exit(1);
    }
}

seedAdminUsers();
