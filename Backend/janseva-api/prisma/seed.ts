import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding JanSeva AI database...');

  // ─── Departments ───────────────────────────────────────
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'JANSEVA' },
      update: {},
      create: {
        name: 'Ministry of Housing and Urban Affairs',
        code: 'JANSEVA',
        description: 'Central government ministry for urban development',
        headEmail: 'secretary@janseva.gov.in',
      },
    }),
    prisma.department.upsert({
      where: { code: 'JJM' },
      update: {},
      create: {
        name: 'Jal Jeevan Mission (Water Supply)',
        code: 'JJM',
        description: 'Water supply and sanitation department',
        headEmail: 'water@gov.in',
      },
    }),
    prisma.department.upsert({
      where: { code: 'MCD' },
      update: {},
      create: {
        name: 'Municipal Corporation',
        code: 'MCD',
        description: 'Municipal services including garbage and roads',
        headEmail: 'mcd@gov.in',
      },
    }),
    prisma.department.upsert({
      where: { code: 'DISCOM' },
      update: {},
      create: {
        name: 'Electricity Distribution Company',
        code: 'DISCOM',
        description: 'Power supply and street lighting',
        headEmail: 'discom@gov.in',
      },
    }),
  ]);

  console.log(`✅ ${departments.length} departments seeded`);

  // ─── Super Admin ───────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@JanSeva2026!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@janseva.gov.in' },
    update: {},
    create: {
      email: 'admin@janseva.gov.in',
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
      citizenId: 'ADM-2026-0001',
    },
  });
  console.log(`✅ Super Admin created: ${admin.email}`);

  // ─── Department Admin ──────────────────────────────────
  const deptAdminPassword = await bcrypt.hash('DeptAdmin@2026!', 12);
  const deptAdmin = await prisma.user.upsert({
    where: { email: 'deptadmin@janseva.gov.in' },
    update: {},
    create: {
      email: 'deptadmin@janseva.gov.in',
      password: deptAdminPassword,
      firstName: 'Rajesh',
      lastName: 'Sharma',
      role: 'DEPT_ADMIN',
      isEmailVerified: true,
      citizenId: 'DEPT-2026-0001',
      departmentId: departments[0].id,
    },
  });
  console.log(`✅ Dept Admin created: ${deptAdmin.email}`);

  // ─── Officer ───────────────────────────────────────────
  const officerPassword = await bcrypt.hash('Officer@2026!', 12);
  const officer = await prisma.user.upsert({
    where: { email: 'officer@janseva.gov.in' },
    update: {},
    create: {
      email: 'officer@janseva.gov.in',
      password: officerPassword,
      firstName: 'Ramesh',
      lastName: 'Kumar',
      role: 'OFFICER',
      isEmailVerified: true,
      citizenId: 'OFF-2026-0001',
      departmentId: departments[1].id,
    },
  });
  console.log(`✅ Officer created: ${officer.email}`);

  // ─── Citizen ───────────────────────────────────────────
  const citizenPassword = await bcrypt.hash('Citizen@2026!', 12);
  const citizen = await prisma.user.upsert({
    where: { email: 'citizen@example.com' },
    update: {},
    create: {
      email: 'citizen@example.com',
      password: citizenPassword,
      firstName: 'Priya',
      lastName: 'Patel',
      phone: '9876543210',
      role: 'CITIZEN',
      isEmailVerified: true,
      citizenId: 'CIT-2026-A1B2',
    },
  });
  console.log(`✅ Demo Citizen created: ${citizen.email}`);

  // ─── Sample Complaint ──────────────────────────────────
  const existingComplaint = await prisma.complaint.findUnique({
    where: { complaintNumber: 'JANSEVA-2026-1245' },
  });

  if (!existingComplaint) {
    const complaint = await prisma.complaint.create({
      data: {
        complaintNumber: 'JANSEVA-2026-1245',
        title: 'Water Supply Issue',
        description: 'There has been no water supply in Green Park, Sector 12 for the past 3 days. This is affecting over 200 households. The main pipeline appears to have a leak near the junction.',
        category: 'WATER_SUPPLY',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        address: 'Green Park, Sector 12',
        locality: 'Green Park',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110016',
        citizenId: citizen.id,
        officerId: officer.id,
        departmentId: departments[1].id,
        aiCategory: 'WATER_SUPPLY',
        aiPriority: 'HIGH',
        aiSummary: 'Critical water supply disruption affecting multiple households due to pipeline leakage.',
        aiAnalyzedAt: new Date(),
      },
    });

    await prisma.complaintTimeline.createMany({
      data: [
        {
          complaintId: complaint.id,
          eventType: 'COMPLAINT_CREATED',
          title: 'Complaint submitted',
          description: 'Complaint submitted to the system',
          newStatus: 'SUBMITTED',
          actorId: citizen.id,
          actorName: 'Priya Patel',
          actorRole: 'CITIZEN',
        },
        {
          complaintId: complaint.id,
          eventType: 'OFFICER_ASSIGNED',
          title: 'Officer Assigned',
          description: 'Complaint assigned to Assistant Engineer',
          previousStatus: 'SUBMITTED',
          newStatus: 'ASSIGNED',
          actorId: deptAdmin.id,
          actorName: 'Rajesh Sharma',
          actorRole: 'DEPT_ADMIN',
        },
        {
          complaintId: complaint.id,
          eventType: 'STATUS_CHANGED',
          title: 'Engineer visit completed. Repair work has been started.',
          description: 'by Ramesh Kumar (Assistant Engineer)',
          previousStatus: 'ASSIGNED',
          newStatus: 'IN_PROGRESS',
          actorId: officer.id,
          actorName: 'Ramesh Kumar',
          actorRole: 'OFFICER',
        },
      ],
    });

    console.log(`✅ Sample complaint created: ${complaint.complaintNumber}`);
  }

  console.log('\n🎉 Database seeding completed!\n');
  console.log('─────────────────────────────────────────');
  console.log('Demo Credentials:');
  console.log('  Super Admin:  admin@janseva.gov.in / Admin@JanSeva2026!');
  console.log('  Dept Admin:   deptadmin@janseva.gov.in / DeptAdmin@2026!');
  console.log('  Officer:      officer@janseva.gov.in / Officer@2026!');
  console.log('  Citizen:      citizen@example.com / Citizen@2026!');
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
