import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Brain, ListChecks, Users, Zap } from "lucide-react";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

const pillars = [
  { icon: Brain, title: "Brain", body: "One context everywhere, your own business is brain." },
  { icon: ListChecks, title: "AI Manager", body: "Your AI Manager on Autopilot." },
  { icon: Users, title: "CRM", body: "One CRM for Agents & Human, Qualify more leads." },
];

export default function Landing() {
  const { user } = useAuth();
  const nav = useNavigate();
  const cta = user ? "/app" : "/register";

  return (
    <div className="min-h-screen grain relative overflow-hidden">
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo className="text-lg" />
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" data-testid="nav-login" className="text-sm font-medium px-3 py-2 hover:text-primary transition-colors">
              Log in
            </Link>
            <Link
              to={cta}
              data-testid="nav-get-started"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:-translate-y-0.5 transition-transform"
            >
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase font-bold text-primary mb-6">
            <Zap className="w-4 h-4" /> AI-Native sales system for real estate.
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
            Respond to every new lead in under 5 minutes.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Arevei instantly engages, qualifies, and routes every new enquiry so your sales team never misses a high-intent buyer because no one followed up in time.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              onClick={() => nav(cta)}
              data-testid="hero-cta"
              className="inline-flex items-center gap-2 px-6 h-12 rounded-full bg-primary text-primary-foreground font-semibold hover:-translate-y-0.5 transition-transform"
            >
              Build my brain <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              I already have an account -&gt;
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="border border-border rounded-md bg-card p-6 hover:-translate-y-1 transition-transform"
              data-testid={`pillar-${i}`}
            >
              <div className="w-10 h-10 rounded-md bg-primary/10 text-primary grid place-items-center mb-4">
                <p.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <Logo />
          <span>AI-Native sales system for real estate.</span>
        </div>
      </footer>
    </div>
  );
}
