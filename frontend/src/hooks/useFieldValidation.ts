/**
 * Hook personnalisé pour la validation en temps réel des champs de formulaire.
 * 
 * Fournit des fonctions de validation et de gestion des erreurs pour les champs.
 */

import { useState, useCallback } from "react";

export interface ValidationRule {
  validator: (value: any) => boolean;
  message: string;
}

export interface FieldValidation {
  error: string | null;
  touched: boolean;
  validate: (value: any) => void;
  onBlur: () => void;
  reset: () => void;
}

/**
 * Hook pour valider un champ avec des règles personnalisées.
 * 
 * @param rules - Règles de validation à appliquer
 * @param initialValue - Valeur initiale du champ
 * @returns Objet avec l'état de validation et les fonctions de gestion
 */
export function useFieldValidation(
  rules: ValidationRule[],
): FieldValidation {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback(
    (value: any) => {
      if (!touched) return; // Ne valider que si le champ a été touché

      for (const rule of rules) {
        if (!rule.validator(value)) {
          setError(rule.message);
          return;
        }
      }
      setError(null);
    },
    [rules, touched],
  );

  const onBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setTouched(false);
  }, []);

  return {
    error,
    touched,
    validate,
    onBlur,
    reset,
  };
}

/**
 * Règles de validation communes.
 */
export const ValidationRules = {
  required: (message = "Ce champ est requis"): ValidationRule => ({
    validator: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (typeof value === "number" && isNaN(value)) return false;
      return true;
    },
    message,
  }),

  min: (min: number, message?: string): ValidationRule => ({
    validator: (value) => {
      const num = typeof value === "number" ? value : parseFloat(value);
      return !isNaN(num) && num >= min;
    },
    message: message || `La valeur doit être supérieure ou égale à ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule => ({
    validator: (value) => {
      const num = typeof value === "number" ? value : parseFloat(value);
      return !isNaN(num) && num <= max;
    },
    message: message || `La valeur doit être inférieure ou égale à ${max}`,
  }),

  minAge: (minAge: number, message?: string): ValidationRule => ({
    validator: (value) => {
      const age = typeof value === "number" ? value : parseInt(value);
      return !isNaN(age) && age >= minAge && age <= 120;
    },
    message: message || `L'âge doit être entre ${minAge} et 120 ans`,
  }),

  positiveNumber: (message = "La valeur doit être positive"): ValidationRule => ({
    validator: (value) => {
      const num = typeof value === "number" ? value : parseFloat(value);
      return !isNaN(num) && num >= 0;
    },
    message,
  }),

  percentage: (message = "La valeur doit être entre 0 et 100"): ValidationRule => ({
    validator: (value) => {
      const num = typeof value === "number" ? value : parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    message,
  }),

  retirementAge: (currentAge: number, message?: string): ValidationRule => ({
    validator: (value) => {
      const age = typeof value === "number" ? value : parseInt(value);
      return !isNaN(age) && age > currentAge && age <= 75;
    },
    message: message || `L'âge de retraite doit être supérieur à ${currentAge} ans et inférieur ou égal à 75 ans`,
  }),

  lifeExpectancy: (retirementAge: number, message?: string): ValidationRule => ({
    validator: (value) => {
      const age = typeof value === "number" ? value : parseInt(value);
      return !isNaN(age) && age > retirementAge && age <= 120;
    },
    message: message || `L'espérance de vie doit être supérieure à ${retirementAge} ans et inférieure ou égale à 120 ans`,
  }),
};

