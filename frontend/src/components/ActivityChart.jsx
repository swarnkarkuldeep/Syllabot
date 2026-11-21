import { motion, useReducedMotion } from "motion/react";
import { sessionStats } from "../lib/sessionStats";

const SLOTS = 7;
const grow = { type: "spring", stiffness: 260, damping: 26 };

/**
 * Session activity: questions asked, average reply time, and one bar per
 * recent answer. Height = reply time, tint = how confident the answer was.
 */
export default function ActivityChart({ messages }) {
  const reduce = useReducedMotion();
  const { asked, avgSeconds, bars } = sessionStats(messages);
  const empties = SLOTS - bars.length;

  return (
    <section className="activity" aria-label="Session activity">
      <div className="activity__head">
        <p className="activity__count">{asked} asked</p>
        {avgSeconds !== null && <p className="activity__avg">{avgSeconds}s average reply</p>}
      </div>

      <div className="activity__plot">
        {bars.map((b, i) => {
          const latest = i === bars.length - 1;
          return (
            <div className="activity__slot" key={b.q}>
              <div className="activity__track">
                <motion.span
                  className={`bar bar--${b.tint}${latest ? " is-latest" : ""}`}
                  style={{ height: `${b.heightPct}%`, originY: 1 }}
                  title={`Question ${b.q}: ${b.seconds}s reply`}
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={reduce ? { duration: 0 } : { ...grow, delay: latest ? 0.05 : 0 }}
                  layout={!reduce}
                />
              </div>
              <span className={`activity__label${latest ? " is-latest" : ""}`}>
                Q{Math.max(1, b.q)}
              </span>
            </div>
          );
        })}
        {Array.from({ length: empties }, (_, i) => (
          <div className="activity__slot" key={`empty-${i}`} aria-hidden>
            <div className="activity__track">
              <span className="bar-ghost" />
            </div>
            <span className="activity__label">&nbsp;</span>
          </div>
        ))}
      </div>

      {bars.length === 0 ? (
        <p className="activity__empty">Your questions and reply times show up here.</p>
      ) : (
        <ul className="activity__legend" aria-label="Bar colors">
          <li><span className="dot bar--mint" />Confident</li>
          <li><span className="dot bar--peach" />Partial</li>
          <li><span className="dot bar--rose" />Unsure</li>
        </ul>
      )}
    </section>
  );
}
