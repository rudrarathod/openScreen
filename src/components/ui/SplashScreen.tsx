import { motion } from "framer-motion";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#09090b] flex flex-col items-center justify-center select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex flex-col items-center gap-6">
        {/* Animated logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            duration: 0.6,
          }}
          className="w-20 h-20 rounded-[28px] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30 relative"
        >
          {/* Pulsing outer ring */}
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-[28px] border-2 border-primary"
          />
          <img src="/pwa-icon.svg" alt="openScreen logo" className="w-12 h-12 select-none pointer-events-none" />
        </motion.div>

        {/* Animated Text */}
        <div className="flex flex-col items-center gap-2">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="font-display font-extrabold text-3xl tracking-tight text-white"
          >
            open<span className="text-primary">Screen</span>
          </motion.h1>
          <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-xs text-muted-foreground tracking-widest uppercase font-semibold opacity-60"
          >
            Streaming & Tracker
          </motion.p>
        </div>
      </div>

      {/* Progress loader at the bottom */}
      <div className="absolute bottom-16 w-36 h-[3px] bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="w-full h-full bg-gradient-to-r from-primary to-accent"
        />
      </div>
    </div>
  );
}
