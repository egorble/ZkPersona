import { useEffect, useRef } from "react";
import "./BackgroundAnimation.css";

export const BackgroundAnimation = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        opacity: number;
    }>>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        // Initialize particles
        const particleCount = 25;
        particlesRef.current = Array.from({ length: particleCount }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.5 + 0.2,
        }));

        let animationFrame: number;
        let time = 0;
        let lastTime = performance.now();

        const animate = (currentTime: number) => {
            if (!currentTime || isNaN(currentTime)) {
                currentTime = performance.now();
            }
            
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            const delta = isNaN(deltaTime) ? 1 : Math.min(Math.max(deltaTime / 16.67, 0), 2);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time += 0.005 * delta;
            
            if (isNaN(time) || !isFinite(time)) {
                time = 0;
            }

            const waveSpeed = 0.3;
            
            const safeOpacity = (base: number, sinValue: number, multiplier: number = 0.02, useCos: boolean = false) => {
                if (isNaN(sinValue) || !isFinite(sinValue)) {
                    return base;
                }
                const trigValue = useCos ? Math.cos(sinValue) : Math.sin(sinValue);
                if (isNaN(trigValue) || !isFinite(trigValue)) {
                    return base;
                }
                const value = base + trigValue * multiplier;
                return Math.max(0, Math.min(1, isNaN(value) ? base : value));
            };
            
            const gradient1 = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient1.addColorStop(0, `rgba(102, 126, 234, ${safeOpacity(0.05, time * waveSpeed)})`);
            gradient1.addColorStop(0.5, `rgba(118, 75, 162, ${safeOpacity(0.05, time * waveSpeed + 1)})`);
            gradient1.addColorStop(1, `rgba(102, 126, 234, ${safeOpacity(0.05, time * waveSpeed + 2)})`);

            const safeSin = (value: number) => {
                if (isNaN(value) || !isFinite(value)) return 0;
                const result = Math.sin(value);
                return isNaN(result) ? 0 : result;
            };
            
            const safeCos = (value: number) => {
                if (isNaN(value) || !isFinite(value)) return 1;
                const result = Math.cos(value);
                return isNaN(result) ? 1 : result;
            };

            ctx.fillStyle = gradient1;
            ctx.beginPath();
            const ellipse1X = canvas.width * 0.2 + safeSin(time * waveSpeed * 0.5) * 50;
            const ellipse1Y = canvas.height * 0.5 + safeCos(time * waveSpeed * 0.5) * 50;
            ctx.ellipse(
                isNaN(ellipse1X) ? canvas.width * 0.2 : ellipse1X,
                isNaN(ellipse1Y) ? canvas.height * 0.5 : ellipse1Y,
                canvas.width * 0.4,
                canvas.height * 0.4,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            const gradient2 = ctx.createLinearGradient(canvas.width, 0, 0, canvas.height);
            gradient2.addColorStop(0, `rgba(118, 75, 162, ${safeOpacity(0.05, time * waveSpeed, 0.02, true)})`);
            gradient2.addColorStop(0.5, `rgba(102, 126, 234, ${safeOpacity(0.05, time * waveSpeed + 1, 0.02, true)})`);
            gradient2.addColorStop(1, `rgba(118, 75, 162, ${safeOpacity(0.05, time * waveSpeed + 2, 0.02, true)})`);

            ctx.fillStyle = gradient2;
            ctx.beginPath();
            const ellipse2X = canvas.width * 0.8 + safeCos(time * waveSpeed * 0.3) * 50;
            const ellipse2Y = canvas.height * 0.8 + safeSin(time * waveSpeed * 0.3) * 50;
            ctx.ellipse(
                isNaN(ellipse2X) ? canvas.width * 0.8 : ellipse2X,
                isNaN(ellipse2Y) ? canvas.height * 0.8 : ellipse2Y,
                canvas.width * 0.3,
                canvas.height * 0.3,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();

            particlesRef.current.forEach((particle) => {
                if (isNaN(delta) || !isFinite(delta)) return;
                
                particle.x += particle.vx * delta;
                particle.y += particle.vy * delta;

                if (particle.x < 0) particle.x = canvas.width;
                if (particle.x > canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = canvas.height;
                if (particle.y > canvas.height) particle.y = 0;

                const pulseValue = time * waveSpeed * 2 + particle.x * 0.01;
                if (isNaN(pulseValue) || !isFinite(pulseValue)) {
                    ctx.fillStyle = `rgba(102, 126, 234, ${particle.opacity * 0.7})`;
                } else {
                    const sinResult = Math.sin(pulseValue);
                    const pulse = isNaN(sinResult) ? 0.7 : sinResult * 0.3 + 0.7;
                    const finalOpacity = Math.max(0, Math.min(1, particle.opacity * (isNaN(pulse) ? 0.7 : pulse)));
                    ctx.fillStyle = `rgba(102, 126, 234, ${finalOpacity})`;
                }
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrame = requestAnimationFrame(animate);
        };

        animate(performance.now());

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <div className="background-animation">
            <canvas ref={canvasRef} className="background-canvas" />
            <div className="ambient-glow" />
        </div>
    );
};

