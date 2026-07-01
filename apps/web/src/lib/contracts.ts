import { HECKLE_ADDRESSES, ZERO_ADDRESS, type Hex } from "@heckle/shared";
import {
  heckleBracketsAbi,
  heckleCharactersAbi,
  heckleEventsAbi,
  heckleTakesAbi,
} from "./abis";

export const charactersContract = {
  address: HECKLE_ADDRESSES.characters,
  abi: heckleCharactersAbi,
} as const;

export const eventsContract = {
  address: HECKLE_ADDRESSES.events,
  abi: heckleEventsAbi,
} as const;

export const takesContract = {
  address: HECKLE_ADDRESSES.takes,
  abi: heckleTakesAbi,
} as const;

export const bracketsContract = {
  address: HECKLE_ADDRESSES.brackets,
  abi: heckleBracketsAbi,
} as const;

export function contractConfigured(address: Hex): boolean {
  return address !== ZERO_ADDRESS;
}
