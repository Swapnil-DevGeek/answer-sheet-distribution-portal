"use client";
import ProfessorDashboard from "@/components/DashboardComponents/ProfessorDashboard";
import StudentDashboard from "@/components/DashboardComponents/StudentDashboard";
import SuperAdminDashboard from "@/components/DashboardComponents/SuperAdminDashboard";
import TADashboard from "@/components/DashboardComponents/TADashboard";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation"; 

type User = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  activeRole?: string;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async ()=> {
      const token = localStorage.getItem('token');
      const storedActiveRole = localStorage.getItem('activeRole');
      try {
        setLoading(true);
        const headers = new Headers();
        headers.set('Authorization', `Bearer ${token}`);

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/me`,{
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user data.");
        }
        const data = await response.json();
        // Use stored active role if available and valid, otherwise set default
        let initialRole = storedActiveRole && data.roles.includes(storedActiveRole)
          ? storedActiveRole
          : data.roles[0];
        
        if (!storedActiveRole && data.roles.includes('ta') && data.roles.includes('student')) {
          initialRole = 'ta'; // Prefer TA role as initial if user has both
        }
        
        setUser({
          ...data,
          activeRole: initialRole
        });
      } catch (error) {
        console.error(error);
      }
      finally{
        setLoading(false);
      }
    }
    fetchUser();
  }, []);
  // Update the role switching logic
  const handleRoleSwitch = async (role: string) => {
    if (user) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/switch-role`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role })
        });

        if (!response.ok) {
          throw new Error('Failed to switch role');
        }

        const data = await response.json();
        setUser({ ...user, activeRole: role });
        localStorage.setItem('token', data.token); // Update token with new active role
        localStorage.setItem('activeRole', role);
      } catch (error) {
        console.error('Error switching role:', error);
      }
    }
  };
  if (loading) {
    return <div className="p-6">Loading...</div>;
  }
  if (!user) {
    return <div className="p-6">Please login to access the dashboard.</div>;
  }
  
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };
  // Update the dashboard content rendering to handle role combinations
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center w-full">
        <div>
          <span className="text-3xl font-bold mb-6 mr-4">Dashboard</span>
          <span className="mb-4">
            Welcome, {user.name}!{" "}
            {user.activeRole && (
              <span className="text-sm text-gray-500">
                ({user.activeRole})
              </span>
            )}
          </span>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback>
                    <UserCircle className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="flex-col items-start">
                <div className="font-medium">Profile</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </DropdownMenuItem>
              {user.roles.length > 1 && (
                <>
                  <DropdownMenuItem className="font-medium">
                    Switch Role
                  </DropdownMenuItem>
                  {user.roles.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => handleRoleSwitch(role)}
                      className={`pl-8 ${
                        user.activeRole === role ? "bg-gray-100" : ""
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Dashboard content based on active role */}
      {user.activeRole === "super_admin" && <SuperAdminDashboard user={user} />}
      {user.activeRole === "professor" && <ProfessorDashboard user={user} />}
      {user.activeRole === "ta" && user.roles.includes("ta") && <TADashboard user={user} />}
      {user.activeRole === "student" && !user.roles.includes("ta") && <StudentDashboard user={user} />}
      {user.activeRole === "student" && user.roles.includes("ta") && <TADashboard user={user} />}
    </div>
  );
}
