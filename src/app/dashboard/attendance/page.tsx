import { prisma } from "@/lib/prisma";
import AttendanceClient from "./attendance-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await prisma.employeeAttendance.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  const employees = await prisma.employee.findMany();
  const totalEmployees = await prisma.employee.count();
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const todayAttendance = await prisma.employeeAttendance.count({ where: { date: { gte: today, lt: tomorrow } } });
  const workingNow = await prisma.employeeAttendance.count({ where: { date: { gte: today, lt: tomorrow }, status: 'working' } });
  return <AttendanceClient data={data} employees={employees} stats={{ totalEmployees, todayAttendance, workingNow }} />;
}
