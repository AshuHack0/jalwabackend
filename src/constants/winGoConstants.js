export const MIN_DEPOSIT_FOR_PREDICTION = 2000;
export const SERVICE_FEE_RATE = 0.02;

export const COLOR_MAP = {
    RED: "RED",
    GREEN: "GREEN",
    VIOLET: "VIOLET",
    RED_VIOLET: "RED_VIOLET",
    GREEN_VIOLET: "GREEN_VIOLET",
}

export const BIG_SMALL_MAP = {
    BIG: "BIG",
    SMALL: "SMALL",
}

export const BET_TYPE_BIG_SMALL = "BIG_SMALL";
export const BET_TYPE_NUMBER = "NUMBER";
export const BET_TYPE_COLOR = "COLOR";

export const VALID_BET_TYPES = [BET_TYPE_BIG_SMALL, BET_TYPE_NUMBER, BET_TYPE_COLOR];

export const DURATION_FROM_PATH = {
    "/WinGo_30S": 30,
    "/WinGo_1Min": 60,
    "/WinGo_3Min": 180,
    "/WinGo_5Min": 300,
};

export const WINGO_GAMES = [
  { name: "WinGo 30 sec", durationSeconds: 30, gameCode: "10005" },
  { name: "WinGo 1 min", durationSeconds: 60, gameCode: "10001" },
  { name: "WinGo 3 min", durationSeconds: 180, gameCode: "10003" },
  { name: "WinGo 5 min", durationSeconds: 300, gameCode: "10004" },
];
export const WINGO_NUMBER_COLOR_MAP = [
    { number: 0, color: COLOR_MAP.RED_VIOLET },
    { number: 1, color: COLOR_MAP.GREEN },
    { number: 2, color: COLOR_MAP.RED },
    { number: 3, color: COLOR_MAP.GREEN },
    { number: 4, color: COLOR_MAP.RED },
    { number: 5, color: COLOR_MAP.GREEN_VIOLET },
    { number: 6, color: COLOR_MAP.RED },
    { number: 7, color: COLOR_MAP.GREEN },
    { number: 8, color: COLOR_MAP.RED },
    { number: 9, color: COLOR_MAP.GREEN },
];

export const WINGO_MULTIPLIERS = [ 1, 5, 10, 20, 50, 100 ];