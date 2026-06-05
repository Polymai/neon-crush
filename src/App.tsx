import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AuthPanel } from "./components/AuthPanel";
import { GameBoard } from "./components/GameBoard";
import { HudPanel } from "./components/HudPanel";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { LoaderOverlay } from "./components/LoaderOverlay";
import { RewardsPanel } from "./components/RewardsPanel";
import { StorePanel } from "./components/StorePanel";
import { useGame } from "./state/gameStore";
import { usePlayer } from "./state/playerStore";

export function App() {
  const game = useGame();
  const player = usePlayer();
  const handledResult = useRef<string>("");
  const handledCheckout = useRef("");

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
          <button className="button button-secondary" type="button" onClick={() => game.startLevel(player.progress.current_level)}>
            Play level {player.progress.current_level}
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
              <p>Swap, cascade, and charge boosters through glowing city-grid puzzles.</p>
              <div className="hero-actions">
                <button className="button button-primary" type="button" onClick={() => game.startLevel(player.progress.current_level)}>
                  Start run
                </button>
                <button className="button button-secondary" type="button" onClick={game.restartLevel}>
                  Reset board
                </button>
              </div>
            </div>
          </motion.section>
          <AuthPanel />
        </div>

        <section id="play" className="game-surface" aria-labelledby="game-title">
          <div className="panel-header">
            <div>
              <h2 id="game-title" className="panel-title">Live board</h2>
              <p className="panel-note">{game.message}</p>
            </div>
            <span className="chip chip-magenta">{player.progress.total_score.toLocaleString()} banked</span>
          </div>
          <GameBoard board={game.board} selected={game.selected} onSelect={game.selectTile} onSwap={game.swapPositions} />
          <p className="status-line" aria-live="polite">
            {game.status === "won" ? "Level complete. Your reward has been banked." : game.status === "lost" ? "Run ended. Try a cleaner chain." : game.message}
          </p>
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
            onUseBooster={handleUseBooster}
            onBuyBooster={player.buyBooster}
            onRestart={game.restartLevel}
            onNext={game.nextLevel}
          />
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
