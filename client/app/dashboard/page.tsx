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
import { toast } from "sonner";

type User = {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "professor" | "student";
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // IMPORTANT: Check for token in URL (from Google OAuth redirect)
    const queryParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = queryParams.get('token');
    
    if (tokenFromUrl) {
      console.log("Token found in URL after Google OAuth redirect");
      localStorage.setItem('token', tokenFromUrl);
      
      // Clean the URL without causing a navigation
      window.history.replaceState({}, document.title, '/dashboard');
      toast.success("Successfully authenticated with Google!");
    }

    const fetchUser = async () => {
      // Get token AFTER checking URL to make sure we have the latest
      const token = localStorage.getItem('token');
      
      console.log("Token available:", token ? "Yes" : "No");
      
      if (!token) {
        console.log("No token found, redirecting to login page");
        router.push('/');
        return;
      }

      try {
        setLoading(true);
        const headers = new Headers();
        headers.set('Authorization', `Bearer ${token}`);

        console.log("Fetching user data...");
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/me`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user data.");
        }
        
        const data = await response.json();
        console.log("User data fetched successfully:", data);
        setUser(data);

      } catch (error) {
        console.error("Error fetching user data:", error);
        localStorage.removeItem('token');
        toast.error("Failed to load user profile. Please log in again.");
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [router]);

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
      {user.role === "student" && <StudentDashboard user={user} />}

    </div>
  );
}
