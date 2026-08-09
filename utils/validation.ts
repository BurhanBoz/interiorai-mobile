/**
 * Client-side email shape check — shared by every screen that collects an
 * address (register, guest upgrade, email change). One regex, one behavior:
 * two screens validating differently is how "it accepted my email over there"
 * bugs are born. The server stays the real authority (@Email + uniqueness).
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
