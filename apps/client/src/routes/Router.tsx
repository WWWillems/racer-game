import { useEffect, useState } from "react";

import { RoomBrowser } from "./RoomBrowser";
import { StartMenu } from "./StartMenu";
import { TestGrounds } from "./TestGrounds";

const LOCATION_CHANGE_EVENT = "racer:locationchange";

export const navigate = (path: string): void => {
  if (window.location.pathname === path) {
    return;
  }

  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
};

export const Router = () => {
  const [path, setPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handleChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleChange);
    window.addEventListener(LOCATION_CHANGE_EVENT, handleChange);

    return () => {
      window.removeEventListener("popstate", handleChange);
      window.removeEventListener(LOCATION_CHANGE_EVENT, handleChange);
    };
  }, []);

  if (path === "/test") {
    return <TestGrounds />;
  }

  if (path === "/play") {
    return <RoomBrowser />;
  }

  return <StartMenu />;
};
