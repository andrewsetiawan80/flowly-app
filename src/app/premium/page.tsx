"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Crown, 
  Check, 
  Sparkles, 
  Zap, 
  Shield, 
  Users, 
  Calendar,
  Star,
  Palette,
  TrendingUp,
  Clock,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PremiumPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3"
        >
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Suggestions",
      description: "Get intelligent task recommendations based on your workflow",
      color: "from-purple-500 to-indigo-500",
      bgColor: "bg-purple-100 dark:bg-purple-950",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      icon: Calendar,
      title: "Advanced Calendar Views",
      description: "Multiple calendar layouts with timeline and Gantt charts",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-100 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share tasks and lists with teammates in real-time",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-100 dark:bg-green-950",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      icon: Palette,
      title: "Custom Themes",
      description: "Personalize your workspace with unlimited color schemes",
      color: "from-pink-500 to-rose-500",
      bgColor: "bg-pink-100 dark:bg-pink-950",
      iconColor: "text-pink-600 dark:text-pink-400"
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Detailed insights and productivity reports",
      color: "from-orange-500 to-amber-500",
      bgColor: "bg-orange-100 dark:bg-orange-950",
      iconColor: "text-orange-600 dark:text-orange-400"
    },
    {
      icon: Shield,
      title: "Priority Support",
      description: "24/7 dedicated support from our expert team",
      color: "from-indigo-500 to-violet-500",
      bgColor: "bg-indigo-100 dark:bg-indigo-950",
      iconColor: "text-indigo-600 dark:text-indigo-400"
    },
    {
      icon: Clock,
      title: "Time Tracking",
      description: "Track time spent on tasks with built-in timer",
      color: "from-teal-500 to-cyan-500",
      bgColor: "bg-teal-100 dark:bg-teal-950",
      iconColor: "text-teal-600 dark:text-teal-400"
    },
    {
      icon: FileText,
      title: "Unlimited Lists & Tasks",
      description: "No limits on the number of lists and tasks you can create",
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-100 dark:bg-red-950",
      iconColor: "text-red-600 dark:text-red-400"
    }
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "Up to 10 lists",
        "Basic task management",
        "Light & dark themes",
        "Mobile responsive",
        "Community support"
      ],
      buttonText: "Current Plan",
      highlighted: false,
      disabled: true
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "per month",
      description: "Unlock the full potential",
      features: [
        "Unlimited lists & tasks",
        "AI-powered suggestions",
        "Advanced analytics",
        "Team collaboration",
        "Priority support",
        "Custom themes",
        "Time tracking",
        "Export capabilities"
      ],
      buttonText: "Upgrade Now",
      highlighted: true,
      disabled: false
    },
    {
      name: "Team",
      price: "$24.99",
      period: "per month",
      description: "Perfect for teams",
      features: [
        "Everything in Premium",
        "Up to 10 team members",
        "Admin dashboard",
        "Role-based permissions",
        "Team analytics",
        "Shared workspaces",
        "SSO integration",
        "Dedicated account manager"
      ],
      buttonText: "Contact Sales",
      highlighted: false,
      disabled: false
    }
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-6"
      >
        <div className="flex items-center justify-center gap-3">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.2, 1.2, 1.2, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
          >
            <Crown className="h-12 w-12 text-yellow-500" />
          </motion.div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            Go Premium
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Supercharge your productivity with advanced features, AI-powered insights, and unlimited possibilities
        </p>
        
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
        >
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium">Limited time offer: 30% off annual plans</span>
        </motion.div>
      </motion.div>

      {/* Features Grid */}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
          <h2 className="text-2xl font-bold">Premium Features</h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group h-full">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  <CardHeader className="space-y-4">
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className={`w-fit rounded-xl p-3 ${feature.bgColor} ring-1 ring-black/5`}
                    >
                      <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          className="flex items-center gap-3"
        >
          <div className="h-8 w-1 bg-gradient-to-b from-pink-500 to-orange-500 rounded-full" />
          <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4 + index * 0.1 }}
              whileHover={{ y: plan.highlighted ? -12 : -8, scale: 1.02 }}
              className={plan.highlighted ? "lg:scale-105" : ""}
            >
              <Card className={`relative overflow-hidden border-2 transition-all duration-300 h-full flex flex-col ${
                plan.highlighted 
                  ? "border-purple-500 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-500/5 shadow-xl shadow-purple-500/20" 
                  : "border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg"
              }`}>
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 left-0">
                    <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white text-xs font-semibold py-2 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Star className="h-3 w-3 fill-current" />
                        MOST POPULAR
                        <Star className="h-3 w-3 fill-current" />
                      </div>
                    </div>
                  </div>
                )}
                
                <CardHeader className={`space-y-4 ${plan.highlighted ? "pt-14" : "pt-6"}`}>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 flex-1 flex flex-col">
                  <div className="space-y-3 flex-1">
                    {plan.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 1.5 + index * 0.1 + idx * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <div className={`rounded-full p-1 mt-0.5 ${
                          plan.highlighted 
                            ? "bg-purple-500/20" 
                            : "bg-muted"
                        }`}>
                          <Check className={`h-3 w-3 ${
                            plan.highlighted 
                              ? "text-purple-600 dark:text-purple-400" 
                              : "text-muted-foreground"
                          }`} />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    disabled={plan.disabled}
                    className={`w-full ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40"
                        : ""
                    }`}
                    size="lg"
                  >
                    {plan.highlighted && <Zap className="mr-2 h-4 w-4" />}
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.8 }}
      >
        <Card className="border-2 border-purple-500/50 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5" />
          <CardContent className="py-12 text-center space-y-6 relative">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                repeatDelay: 2
              }}
            >
              <Sparkles className="h-16 w-16 mx-auto text-purple-500" />
            </motion.div>
            <div className="space-y-3">
              <h3 className="text-3xl font-bold">Ready to transform your workflow?</h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands of professionals who have already upgraded to Premium and experience the difference
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40">
                <Crown className="mr-2 h-5 w-5" />
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline">
                Compare Plans
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No credit card required • Cancel anytime • 30-day money-back guarantee
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
