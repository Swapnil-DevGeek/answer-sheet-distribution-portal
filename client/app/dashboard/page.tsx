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
  role: "super_admin" | "professor" | "ta" | "student";
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async ()=> {
      const token = localStorage.getItem('token');
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
        console.log(data);
        setUser(data);

      } catch (error) {
        console.error(error);
      }
      finally{
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center w-full">
        <div>
          <span className="text-3xl font-bold mb-6 mr-4">Dashboard</span>
          <span className="mb-4">
            Welcome, {user.name}! 
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
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {user.role === "super_admin" && <SuperAdminDashboard />}
      {user.role === "professor" && <ProfessorDashboard user={user} />}
      {user.role === "ta" && <TADashboard user={user} />}
      {user.role === "student" && <StudentDashboard user={user} />}

    </div>
  );
}
