import { Dice } from "../../domain/types";

export const getDiceUnicode = (dice: Dice): string => {
  return dice.toString();
};
