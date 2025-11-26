/**
 * Composant SkeletonLoader pour afficher des placeholders pendant le chargement.
 */

import { Box, Skeleton } from "@mui/material";
import type { SkeletonProps } from "@mui/material";

interface SkeletonLoaderProps extends SkeletonProps {
  count?: number;
  spacing?: number;
}

/**
 * Composant pour afficher plusieurs skeletons avec espacement.
 */
export function SkeletonLoader({ count = 1, spacing = 2, ...skeletonProps }: SkeletonLoaderProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: spacing }}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} {...skeletonProps} />
      ))}
    </Box>
  );
}

/**
 * Skeleton pour un formulaire de champ.
 */
export function FieldSkeleton() {
  return (
    <Box sx={{ mb: 2 }}>
      <Skeleton variant="text" width="30%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

/**
 * Skeleton pour une carte de formulaire.
 */
export function CardSkeleton() {
  return (
    <Box sx={{ p: 2, mb: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
      <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
    </Box>
  );
}

/**
 * Skeleton pour une liste de résultats.
 */
export function ResultsSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width="60%" height={40} sx={{ mb: 3 }} />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 2, mb: 4 }}>
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
      </Box>
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
    </Box>
  );
}

