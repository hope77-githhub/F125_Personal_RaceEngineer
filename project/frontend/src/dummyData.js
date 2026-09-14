const corners = [
    "Turn 1 (Abbey)", "Turn 2 (Farm)", "Turn 3 (Village)", "Turn 4 (The Loop)",
    "Turn 5 (Aintree)", "Turn 6 (Brooklands)", "Turn 7 (Luffield)", "Turn 8 (Woodcote)",
    "Turn 9 (Copse)", "Turn 10 (Maggotts)", "Turn 11 (Becketts)", "Turn 12 (Chapel)",
    "Turn 13 (Stowe)", "Turn 14 (Vale)", "Turn 15 (Club)", "Turn 16 (Chicane In)",
    "Turn 17 (Chicane Mid)", "Turn 18 (Club Exit)"
];

function generateTelemetry(baseBrake, baseThrottle, timeDiffBase) {
    return corners.map(c => {
        const b = Math.max(0, Math.min(100, baseBrake + Math.floor(Math.random() * 21) - 10));
        const t = Math.max(0, Math.min(100, baseThrottle + Math.floor(Math.random() * 21) - 10));
        const rb = Math.max(0, Math.min(100, b + Math.floor(Math.random() * 11) - 5));
        const rt = Math.max(0, Math.min(100, t + Math.floor(Math.random() * 11) - 5));
        
        const td = (timeDiffBase + (Math.random() * 0.2 - 0.1)).toFixed(2);
        const td_str = `${td > 0 ? '+' : ''}${td}s ${td < 0 ? '(Faster)' : td > 0 ? '(Slower)' : '(Equal)'}`;
        
        const lb = Math.max(0, Math.min(100, b + Math.floor(Math.random() * 17) - 8));
        const lt = Math.max(0, Math.min(100, t + Math.floor(Math.random() * 17) - 8));
        const ld = (timeDiffBase + (Math.random() * 0.2)).toFixed(2);
        const ld_str = `${ld > 0 ? '+' : ''}${ld}s ${ld < 0 ? '(Faster)' : ld > 0 ? '(Slower)' : '(Equal)'}`;

        return {
            distance: c,
            brake: b,
            throttle: t,
            wear_diff: (Math.random() * 0.09 + 0.01).toFixed(2),
            time_diff_to_rival: td_str,
            rival_brake: rb,
            rival_throttle: rt,
            wear_diff_leader: (Math.random() * 0.13 + 0.02).toFixed(2),
            time_diff_leader: ld_str,
            leader_brake: lb,
            leader_throttle: lt
        };
    });
}

function getSetup(fw, rw, bb) {
    return {
        front_wing: fw,
        rear_wing: rw,
        on_throttle_diff: `${Math.floor(Math.random() * 51) + 50}%`,
        off_throttle_diff: `${Math.floor(Math.random() * 51) + 50}%`,
        front_camber: `${(Math.random() * -1 - 2.5).toFixed(2)}°`,
        rear_camber: `${(Math.random() * -1 - 1.0).toFixed(2)}°`,
        front_toe: `${(Math.random() * 0.1).toFixed(2)}°`,
        rear_toe: `${(Math.random() * 0.3 + 0.2).toFixed(2)}°`,
        front_suspension: Math.floor(Math.random() * 11) + 1,
        rear_suspension: Math.floor(Math.random() * 11) + 1,
        front_anti_roll_bar: Math.floor(Math.random() * 11) + 1,
        rear_anti_roll_bar: Math.floor(Math.random() * 11) + 1,
        front_suspension_height: Math.floor(Math.random() * 11) + 1,
        rear_suspension_height: Math.floor(Math.random() * 11) + 1,
        brake_pressure: `${Math.floor(Math.random() * 21) + 80}%`,
        brake_bias: bb,
        engine_braking: `${Math.floor(Math.random() * 51) + 50}%`,
        tyre_pressures: Array(4).fill(0).map(() => +(Math.random() * 2 + 22).toFixed(1)),
        ballast: Math.floor(Math.random() * 12),
        fuel_load: +(Math.random() * 100 + 10).toFixed(1)
    };
}

const p1_setup = getSetup(20, 15, "58%");
const p2_setup = getSetup(18, 12, "56%");
const p3_setup = getSetup(22, 18, "59%");

const p1_lap_hist = [
    { lap: 13, time: "1:24.312", delta: "-0.150", avg_tyre_wear_lap: 1.2, telemetry_points: generateTelemetry(85, 15, -0.05) },
    { lap: 14, time: "1:24.501", delta: "+0.189", avg_tyre_wear_lap: 1.5, telemetry_points: generateTelemetry(85, 15, 0.0) }
];
const p2_lap_hist = [
    { lap: 13, time: "1:24.400", delta: "+0.100", avg_tyre_wear_lap: 1.0, telemetry_points: generateTelemetry(80, 20, 0.05) },
    { lap: 14, time: "1:24.450", delta: "+0.050", avg_tyre_wear_lap: 1.1, telemetry_points: generateTelemetry(80, 20, 0.0) }
];
const p3_lap_hist = [
    { lap: 13, time: "1:24.600", delta: "+0.300", avg_tyre_wear_lap: 1.4, telemetry_points: generateTelemetry(90, 10, 0.1) }
];

export function getDummyPayload(units = "metric") {
    const t = Date.now() / 1000;
    let speed_p1 = 280 + 30 * Math.sin(t);
    if (units === "imperial") {
        speed_p1 = Math.floor(speed_p1 * 0.621371);
    }
    const gear_p1 = Math.max(1, Math.min(8, Math.floor((speed_p1 / (units==='imperial'?200:320)) * 8)));
    const rpm_p1 = 10000 + 2000 * Math.sin(t * 2);
    const throttle = Math.max(0, Math.min(100, Math.floor(50 + 50 * Math.sin(t))));
    const brake = throttle > 10 ? 0 : Math.floor(50 + 50 * Math.cos(t));

    return {
        status: "live",
        circuit_environment: {
            track_name: "Silverstone",
            weather: "Sunny",
            track_temp: units === 'imperial' ? 90 : 32,
            air_temp: units === 'imperial' ? 75 : 24,
            track_length: 5891,
            total_laps: 52
        },
        players: [
            {
                id: "p_1",
                name: "HAM (You)",
                position: 1,
                gap: "Leader",
                current_lap: 14,
                tyre_compound: "Soft (C3)",
                strategy: "Plan A: Box Lap 18 for Hards. Current tyre degradation is slightly higher than expected in Sector 1. Suggest shifting brake bias forward to save rears.",
                car_setup: p1_setup,
                live_telemetry: { speed: Math.floor(speed_p1), gear: gear_p1, rpm: Math.floor(rpm_p1), throttle, brake, tyre_wear: [15.2, 15.0, 16.5, 16.1] },
                lap_history: p1_lap_hist
            },
            {
                id: "p_2",
                name: "VER",
                position: 2,
                gap: "+2.4s",
                current_lap: 14,
                tyre_compound: "Medium (C2)",
                strategy: "Plan B: Going long. Expected Box Lap 25. He is braking earlier and smoother, saving 0.1% more tyre wear per lap at Turn 4.",
                car_setup: p2_setup,
                live_telemetry: { speed: units === 'imperial' ? 195 : 315, gear: 8, rpm: 11800, throttle: 100, brake: 0, tyre_wear: [12.1, 12.0, 13.5, 13.5] },
                lap_history: p2_lap_hist
            },
            {
                id: "p_3",
                name: "NOR",
                position: 3,
                gap: "+4.1s",
                current_lap: 14,
                tyre_compound: "Soft (C3)",
                strategy: "Aggressive 2-stop. High tyre wear detected. Might undercut on Lap 16.",
                car_setup: p3_setup,
                live_telemetry: { speed: units === 'imperial' ? 189 : 305, gear: 8, rpm: 11200, throttle: 100, brake: 0, tyre_wear: [18.2, 18.0, 19.5, 19.2] },
                lap_history: p3_lap_hist
            }
        ]
    };
}
