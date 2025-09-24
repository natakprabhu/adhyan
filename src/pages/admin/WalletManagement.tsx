import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const WalletManagement = () => {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallets = async () => {
      setLoading(true);

      // Fetch user wallets (assuming you have a `wallets` table with balance + user relation)
      const { data, error } = await supabase
        .from("wallets")
        .select("id, balance, users(name, email)");

      if (error) {
        console.error("❌ fetchWallets error:", error);
      } else {
        setWallets(data || []);
      }

      setLoading(false);
    };

    fetchWallets();
  }, []);

  if (loading) return <div>Loading Wallets...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">User Wallets</h2>
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">User</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          {wallets.map((w) => (
            <tr key={w.id}>
              <td className="border p-2">{w.users?.name ?? "Unknown"}</td>
              <td className="border p-2">{w.users?.email ?? "—"}</td>
              <td className="border p-2 font-bold">₹{w.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
