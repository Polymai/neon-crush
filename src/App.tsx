import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AuthPanel } from "./components/AuthPanel";
import { GameBoard } from "./components/GameBoard";
import { HudPanel } from "./components/HudPanel";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { LoaderOverlay } from "./components/LoaderOverlay";
import { RewardsPanel } from "./components/RewardsPanel";
import { StorePanel } from "./components/StorePanel";
import { TILE_META } from "./game/tiles";
import { useGame } from "./state/gameStore";
import { usePlayer } from "./state/playerStore";

function objectiveCopy(
  level: ReturnType<typeof useGame>["level"],
  goalsCleared: ReturnType<typeof useGame>["goalsCleared"],
  score: number,
  movesLeft: number,
) {
  const remainingGoals = level.goals
    .map((goal) => {
      const cleared = goalsCleared[goal.kind] || 0;
      return {
        kind: goal.kind,
        label: TILE_META[goal.kind].label,
        remaining: Math.max(0, goal.count - cleared),
        total: goal.count,
      };
    })
    .filter((goal) => goal.remaining > 0);
  const scoreLeft = Math.max(0, level.targetScore - score);
  const mainGoal = remainingGoals[0];

  return {
    title: mainGoal ? `Collect ${mainGoal.remaining} ${mainGoal.label}` : scoreLeft ? `Score ${scoreLeft.toLocaleString()} more` : "Ready to clear",
    detail: mainGoal
      ? `Drag tiles into any line direction and reach ${level.targetScore.toLocaleString()} points. ${movesLeft} moves left.`
      : scoreLeft
        ? `${scoreLeft.toLocaleString()} points left to finish this level.`
        : "Target complete. Finish the run and bank the level.",
  };
}

export function App() {
  const game = useGame();
  const player = usePlayer();
  const [playFullscreen, setPlayFullscreen] = useState(false);
  const handledResult = useRef<string>("");
  const handledCheckout = useRef("");
  const scoreMetricRef = useRef<HTMLDivElement>(null);
  const playStageRef = useRef<HTMLElement>(null);
  const objective = objectiveCopy(game.level, game.goalsCleared, game.score, game.movesLeft);

  useEffect(() => {
    if (!game.lastResult || handledResult.current === game.lastResult.resultId) return;
    handledResult.current = game.lastResult.resultId;
    void player.completeLevel(game.lastResult).then(() => game.acknowledgeResult());
  }, [game, player]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id") || "";
    const checkout = url.searchParams.get("checkout") || "";
    if (checkout === "success" && sessionId && handledCheckout.current !== sessionId) {
      handledCheckout.current = sessionId;
      void player.reconcileCoinPackPayment(sessionId).finally(() => {
        url.searchParams.delete("checkout");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
      });
    }
    if (checkout === "canceled") {
      player.markCheckoutCanceled();
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    }
  }, [player]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) setPlayFullscreen(false);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function openFullscreenPlay() {
    setPlayFullscreen(true);
    const playStage = playStageRef.current;
    if (playStage?.requestFullscreen) void playStage.requestFullscreen().catch(() => undefined);
  }

  function startFullscreenRun() {
    game.startLevel(player.progress.current_level);
    openFullscreenPlay();
  }

  function exitFullscreenPlay() {
    setPlayFullscreen(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }

  async function handleUseBooster(key: Parameters<typeof player.spendBooster>[0]) {
    const spent = await player.spendBooster(key);
    if (spent) game.useBoardBooster(key);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand" aria-label="Neon Crush">
          <span className="brand-mark" aria-hidden="true">NC</span>
          <span>
            <span className="wordmark">Neon Crush</span>
            <span className="subtle">Arcade match-3</span>
          </span>
        </div>
        <div className="row-actions">
          <button className="button button-secondary" type="button" onClick={startFullscreenRun}>
            Play fullscreen
          </button>
          <button className="button button-primary" type="button" onClick={() => player.refreshLeaderboard()}>
            Refresh scores
          </button>
        </div>
      </header>

      <main className="app-grid">
        <div>
          <motion.section
            className="hero-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="hero-copy">
              <p className="eyebrow">Level {game.level.id}</p>
              <h1>Neon Crush</h1>
              <p>{objective.title}. {objective.detail}</p>
              <div className="hero-actions">
                <button className="button button-primary" type="button" onClick={startFullscreenRun}>
                  Play fullscreen
                </button>
                <button className="button button-secondary" type="button" onClick={game.restartLevel}>
                  Reset board
                </button>
              </div>
            </div>
          </motion.section>
          <AuthPanel />
        </div>

        <section
          id="play"
          ref={playStageRef}
          className={`game-surface play-stage ${playFullscreen ? "play-fullscreen" : "play-closed"}`}
          aria-labelledby="game-title"
        >
          {playFullscreen ? (
            <div className="play-board-area">
              <div className="play-topbar">
                <div>
                  <h2 id="game-title" className="panel-title">Level {game.level.id}: {objective.title}</h2>
                  <p className="panel-note">{objective.detail}</p>
                </div>
                <div className="row-actions">
                  <span className="chip chip-magenta">{player.progress.total_score.toLocaleString()} banked</span>
                  <button className="button button-secondary" type="button" onClick={exitFullscreenPlay}>
                    Exit
                  </button>
                </div>
              </div>
              <div className="play-fullscreen-grid">
                <div>
                  <GameBoard
                    board={game.board}
                    selected={game.selected}
                    effect={game.effect}
                    scoreTargetRef={scoreMetricRef}
                    onSelect={game.selectTile}
                    onSwap={game.swapPositions}
                  />
                  <p className="status-line" aria-live="polite">
                    {game.status === "won" ? "Level complete. Your reward has been banked." : game.status === "lost" ? "Run ended. Try a cleaner chain." : game.message}
                  </p>
                </div>
                <HudPanel
                  level={game.level}
                  score={game.score}
                  movesLeft={game.movesLeft}
                  tilesCleared={game.tilesCleared}
                  bestCombo={game.bestCombo}
                  goalsCleared={game.goalsCleared}
                  boosters={player.boosters}
                  coins={player.progress.coins}
                  status={game.status}
                  scoreMetricRef={scoreMetricRef}
                  onUseBooster={handleUseBooster}
                  onBuyBooster={player.buyBooster}
                  onRestart={game.restartLevel}
                  onNext={game.nextLevel}
                />
              </div>
            </div>
          ) : (
            <div className="play-launch-card">
              <p className="eyebrow">Fullscreen play</p>
              <h2 id="game-title">Open the board to play</h2>
              <p>{objective.title}. {objective.detail}</p>
              <div className="objective-pills" aria-label="Level snapshot">
                <span><strong>{game.score.toLocaleString()}</strong> score</span>
                <span><strong>{game.level.targetScore.toLocaleString()}</strong> target</span>
                <span><strong>{game.movesLeft}</strong> moves</span>
              </div>
              <button className="button button-primary" type="button" onClick={openFullscreenPlay}>
                Play fullscreen
              </button>
            </div>
          )}
        </section>

        <div>
          <RewardsPanel
            nextDailyReward={player.nextDailyReward}
            rewardMessage={player.rewardMessage}
            achievements={player.achievements}
            gamesPlayed={player.progress.games_played}
            onClaim={player.claimDailyReward}
          />
          <StorePanel
            signedIn={!!player.user}
            paymentStatus={player.paymentStatus}
            paymentMessage={player.paymentMessage}
            onBuyPack={player.startCoinCheckout}
          />
          <LeaderboardPanel
            entries={player.leaderboard}
            period={player.leaderboardPeriod}
            dataError={player.dataError}
            onRefresh={player.refreshLeaderboard}
          />
        </div>
      </main>
      <LoaderOverlay
        show={player.loading || player.saving || player.paymentStatus === "redirecting" || player.paymentStatus === "settling"}
        label={
          player.loading
            ? "Loading player state"
            : player.paymentStatus === "redirecting"
              ? "Opening secure checkout"
              : player.paymentStatus === "settling"
                ? "Adding coin pack"
                : "Saving progress"
        }
      />
    </div>
  );
}
