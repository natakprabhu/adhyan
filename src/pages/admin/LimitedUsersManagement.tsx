import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const LimitedUsersManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("user_id, users(*)")
        .eq("seat_category", "limited") // assuming category is called "limited"
        .eq("payment_status", "paid");
      if (!error && data) setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  if (loading) return <div>Loading Limited Hours Users...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Limited Hours Users</h2>
      <ul className="space-y-2">
        {users.map((u, i) => (
          <li key={i} className="p-2 bg-white shadow rounded">
            {u.users?.name ?? "Unknown User"}
          </li>
        ))}
      </ul>
    </div>
  );
};
