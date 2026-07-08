import { HECKLE_ADDRESSES, ZERO_ADDRESS, type Hex } from "@heckle/shared";
import {
  heckleBracketsAbi,
  heckleCharactersAbi,
  heckleEventsAbi,
  heckleResolverAbi,
  heckleTakesAbi,
  heckleVerifiedTakesAbi,
  heckleVotesAbi,
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

export const verifiedTakesContract = {
  address: HECKLE_ADDRESSES.verifiedTakes,
  abi: heckleVerifiedTakesAbi,
} as const;

export const bracketsContract = {
  address: HECKLE_ADDRESSES.brackets,
  abi: heckleBracketsAbi,
} as const;

export const votesContract = {
  address: HECKLE_ADDRESSES.votes,
  abi: heckleVotesAbi,
} as const;

export const resolverContract = {
  address: HECKLE_ADDRESSES.resolver,
  abi: heckleResolverAbi,
} as const;

export function contractConfigured(address: Hex): boolean {
  return address !== ZERO_ADDRESS;
}
