import { navigate } from "./Router";

export const StartMenu = () => {
  return (
    <div className="start-menu">
      <div className="start-menu-card stack">
        <div className="stack">
          <h1>Funny Isometric Racer</h1>
          <p className="tiny-text">Choose how you want to drive.</p>
        </div>

        <div className="start-menu-actions">
          <button onClick={() => navigate("/play")} type="button">
            Multiplayer
          </button>
          <button className="secondary" onClick={() => navigate("/test")} type="button">
            Test Mode
          </button>
        </div>

        <p className="tiny-text">
          Test Mode spawns a solo practice room with a stationary dummy so you can race without waiting for friends.
        </p>
      </div>
    </div>
  );
};
