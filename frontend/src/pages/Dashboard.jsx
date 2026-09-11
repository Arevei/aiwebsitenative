import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "../lib/api";

export default function Dashboard() {
  const nav = useNavigate();

  useEffect(() => {
    api.get("/workspaces")
      .then((r) => {
        const latest = r.data?.[0];
        nav(latest ? `/app/w/${latest.id}` : "/welcome", { replace: true });
      })
      .catch(() => nav("/welcome", { replace: true }));
  }, [nav]);

  return (
    <div className="min-h-screen grid place-items-center text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
}
