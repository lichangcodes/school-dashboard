import { useCustom, useLink } from "@refinedev/core";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Building2,
  ClipboardCheck,
  GraduationCap,
  Layers,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BACKEND_BASE_URL } from "@/constants";

// Shapes returned by GET /api/stats/*. The backend does the counting, so the
// dashboard is right however many rows exist.
type Overview = {
  users: number;
  teachers: number;
  admins: number;
  students: number;
  subjects: number;
  departments: number;
  classes: number;
  enrollments: number;
};

type Charts = {
  usersByRole: { role: string; total: number }[];
  subjectsByDepartment: { departmentName: string; totalSubjects: number }[];
  classesBySubject: { subjectName: string; totalClasses: number }[];
};

type Latest = {
  latestClasses: {
    id: number;
    name: string;
    subject: { name: string } | null;
    teacher: { name: string } | null;
  }[];
  latestTeachers: { id: string; name: string; email: string }[];
};

const roleColors = ["#f97316", "#0ea5e9", "#22c55e", "#a855f7"];

const useStats = <T,>(path: string) => {
  const { result } = useCustom<{ data: T }>({
    url: `${BACKEND_BASE_URL}stats/${path}`,
    method: "get",
  });
  return result.data?.data;
};

const topFive = <T,>(rows: T[], key: (row: T) => number) =>
  [...rows].sort((a, b) => key(b) - key(a)).slice(0, 5);

const Dashboard = () => {
  const Link = useLink();
  const overview = useStats<Overview>("overview");
  const charts = useStats<Charts>("charts");
  const latest = useStats<Latest>("latest");

  const usersByRole = charts?.usersByRole ?? [];
  const subjectsByDepartment = charts?.subjectsByDepartment ?? [];
  const classesBySubject = charts?.classesBySubject ?? [];
  const newestClasses = latest?.latestClasses ?? [];
  const newestTeachers = latest?.latestTeachers ?? [];

  const topDepartments = topFive(subjectsByDepartment, (d) => d.totalSubjects);
  const topSubjects = topFive(classesBySubject, (s) => s.totalClasses);

  const kpis = [
    { label: "Total Users", value: overview?.users, icon: Users, accent: "text-blue-600" },
    { label: "Teachers", value: overview?.teachers, icon: GraduationCap, accent: "text-emerald-600" },
    { label: "Admins", value: overview?.admins, icon: ShieldCheck, accent: "text-amber-600" },
    { label: "Subjects", value: overview?.subjects, icon: BookOpen, accent: "text-purple-600" },
    { label: "Departments", value: overview?.departments, icon: Building2, accent: "text-cyan-600" },
    { label: "Classes", value: overview?.classes, icon: Layers, accent: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted-foreground">
          A quick snapshot of the latest activity and key metrics.
        </p>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-border bg-muted/20 p-4 hover:border-primary/40 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {kpi.label}
                  </p>
                  <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
                </div>
                <div className="mt-2 text-2xl font-semibold">{kpi.value ?? "–"}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    dataKey="total"
                    nameKey="role"
                    data={usersByRole}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {usersByRole.map((entry, index) => (
                      <Cell
                        key={`${entry.role}-${index}`}
                        fill={roleColors[index % roleColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2">
              {usersByRole.map((entry, index) => (
                <span
                  key={entry.role}
                  className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: roleColors[index % roleColors.length],
                    }}
                  />
                  {entry.role} · {entry.total}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Students</CardTitle>
              <UserRound className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {overview?.students ?? "–"}
              </div>
              <p className="text-sm text-muted-foreground">
                Registered student accounts
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Enrollments</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-sky-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">
                {overview?.enrollments ?? "–"}
              </div>
              <p className="text-sm text-muted-foreground">
                Student seats taken across all classes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Subjects per Department
            </h3>
            <div className="h-80">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={subjectsByDepartment}>
                  <XAxis
                    dataKey="departmentName"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="totalSubjects"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Classes per Subject
            </h3>
            <div className="h-80">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={classesBySubject}>
                  <XAxis
                    dataKey="subjectName"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="totalClasses"
                    fill="#0ea5e9"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Newest Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {newestClasses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recent classes.
              </p>
            )}
            {newestClasses.map((item, index) => (
              <Link
                key={item.id}
                to={`/classes/show/${item.id}`}
                className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 transition-colors hover:border-primary/30 hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.subject?.name ?? "No subject"} ·{" "}
                      {item.teacher?.name ?? "No teacher"}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">New</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Newest Teachers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {newestTeachers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recent teachers.
              </p>
            )}
            {newestTeachers.map((teacher, index) => (
              <Link
                key={teacher.id}
                to={`/faculty/show/${teacher.id}`}
                className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 transition-colors hover:border-primary/30 hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{teacher.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {teacher.email}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">New</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Departments with Most Subjects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDepartments.map((dept, index) => (
              <div
                key={dept.departmentName}
                className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 transition-colors hover:border-primary/30 hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{dept.departmentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {dept.totalSubjects} {dept.totalSubjects === 1 ? "subject" : "subjects"}
                    </p>
                  </div>
                </div>
                <Badge>{dept.totalSubjects}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Subjects with Most Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topSubjects.map((subject, index) => (
              <div
                key={subject.subjectName}
                className="flex items-center justify-between rounded-md border border-transparent px-3 py-2 transition-colors hover:border-primary/30 hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{subject.subjectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {subject.totalClasses} {subject.totalClasses === 1 ? "class" : "classes"}
                    </p>
                  </div>
                </div>
                <Badge>{subject.totalClasses}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Separator />
    </div>
  );
};

export default Dashboard;
