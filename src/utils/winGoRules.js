import { SERVICE_FEE_RATE } from "../constants/winGoConstants.js";

// Core WinGo rules; multipliers apply on contract amount (bet minus 2% fee, e.g. 100 -> 98).

// Returns derived big/small and color from result digit (0-9).
export const getOutcomeFromDigit = (digit) => {
    if (digit < 0 || digit > 9 || !Number.isInteger(digit)) {
        throw new Error("WinGo outcome digit must be an integer between 0 and 9.");
    }

    const bigSmall = digit >= 5 ? "big" : "small";

    // 1,3,7,9 => GREEN; 2,4,6,8 => RED; 0 => RED_VIOLET; 5 => GREEN_VIOLET
    let color;
    if ([1, 3, 7, 9].includes(digit)) {
        color = "GREEN";
    } else if ([2, 4, 6, 8].includes(digit)) {
        color = "RED";
    } else if (digit === 0) {
        color = "RED_VIOLET";
    } else {
        color = "GREEN_VIOLET"; // digit === 5
    }

    return { bigSmall, color };
};

// Computes win/loss and payout from bet and winning digit. Payouts: Green 1,3,7,9=>2x 5=>1.5x; Red 2,4,6,8=>2x 0=>1.5x; Violet 0|5=>4.5x; Number exact=>9x; Big/Small=>2x.
export const calculateBetPayout = (bet, winningDigit) => {
    if (!bet || typeof bet.amount !== "number" || bet.amount <= 0) {
        throw new Error("Invalid WinGo bet payload.");
    }

    if (winningDigit < 0 || winningDigit > 9 || !Number.isInteger(winningDigit)) {
        throw new Error("Winning digit must be an integer between 0 and 9.");
    }

    const amount = bet.amount;
    const contractAmount = Math.round(amount * (1 - SERVICE_FEE_RATE) * 100) / 100; // keep 2 decimals

    let payoutAmount = 0;
    let isWin = false;

    const { bigSmall, color } = getOutcomeFromDigit(winningDigit);

    // Big / Small bets (normalize case: DB may store "BIG"/"SMALL")
    const choiceBigSmallNorm = bet.choiceBigSmall && String(bet.choiceBigSmall).toLowerCase();
    if (choiceBigSmallNorm === "big" || choiceBigSmallNorm === "small") {
        if (choiceBigSmallNorm === bigSmall) {
            payoutAmount += contractAmount * 2;
            isWin = true;
        }
    }

    // Color bets
    if (bet.choiceColor) {
        if (bet.choiceColor === "GREEN") {
            if ([1, 3, 7, 9].includes(winningDigit)) {
                payoutAmount += contractAmount * 2;
                isWin = true;
            } else if (winningDigit === 5) {
                payoutAmount += contractAmount * 1.5;
                isWin = true;
            }
        } else if (bet.choiceColor === "RED") {
            if ([2, 4, 6, 8].includes(winningDigit)) {
                payoutAmount += contractAmount * 2;
                isWin = true;
            } else if (winningDigit === 0) {
                payoutAmount += contractAmount * 1.5;
                isWin = true;
            }
        } else if (bet.choiceColor === "VIOLET") {
            if (winningDigit === 0 || winningDigit === 5) {
                payoutAmount += contractAmount * 4.5;
                isWin = true;
            }
        }
    }

    // Exact number bet
    if (typeof bet.choiceNumber === "number") {
        if (bet.choiceNumber === winningDigit) {
            payoutAmount += contractAmount * 9;
            isWin = true;
        }
    }

    // Round payout to 2 decimals for currency safety.
    payoutAmount = Math.round(payoutAmount * 100) / 100;

    return {
        isWin,
        payoutAmount,
        contractAmount,
    };
};

export const getServiceFeeRate = () => SERVICE_FEE_RATE;
