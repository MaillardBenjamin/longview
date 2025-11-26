/**
 * Composant d'indicateur de progression pour les calculs de simulation.
 * 
 * Affiche la progression en pourcentage, l'étape en cours et un message de statut.
 */

import "./ProgressIndicator.css";

interface ProgressIndicatorProps {
  progressPercent: number;
  currentStep: string;
  stepDescription?: string;
  message?: string;
  isComplete?: boolean;
  error?: string | null;
}

export function ProgressIndicator({
  progressPercent,
  currentStep,
  stepDescription,
  message,
  isComplete = false,
  error = null,
}: ProgressIndicatorProps) {
  const displayPercent = Math.min(100, Math.max(0, progressPercent));
  
  // Afficher stepDescription si disponible, sinon currentStep
  const displayStep = stepDescription || currentStep;
  // Afficher message si disponible (priorité au message détaillé)
  const displayMessage = error || message;
  
  // Déterminer si on est en phase d'optimisation pour un affichage spécial
  const isOptimization = currentStep === "optimisation";

  // Messages détaillés selon l'étape
  const getDetailedMessage = () => {
    if (error) return error;
    if (message) return message;
    
    const stepMessages: Record<string, string> = {
      initialisation: "Initialisation de la simulation...",
      capitalisation: `Simulation de la phase de capitalisation (${displayPercent.toFixed(0)}%)...`,
      retraite: `Simulation de la phase de retraite (${displayPercent.toFixed(0)}%)...`,
      optimisation: `Optimisation de l'épargne mensuelle (${displayPercent.toFixed(0)}%)...`,
    };
    
    return stepMessages[currentStep] || `Étape : ${displayStep} (${displayPercent.toFixed(0)}%)`;
  };

  return (
    <div className="progress-indicator">
      <div className="progress-indicator__header">
        <h3 className="progress-indicator__title">
          {isComplete ? "Calcul terminé" : "Calcul en cours..."}
        </h3>
        <span className="progress-indicator__percent">{displayPercent.toFixed(1)}%</span>
      </div>
      
      <div className="progress-indicator__bar-container">
        <div 
          className="progress-indicator__bar"
          style={{ width: `${displayPercent}%` }}
        />
      </div>
      
      <div className="progress-indicator__details">
        <div className="progress-indicator__step">
          <strong>Étape :</strong> {displayStep}
        </div>
        {stepDescription && stepDescription !== displayStep && (
          <div className="progress-indicator__description">
            {stepDescription}
          </div>
        )}
        <div className={`progress-indicator__message ${error ? 'progress-indicator__message--error' : isOptimization ? 'progress-indicator__message--optimization' : ''}`}>
          {error || displayMessage || getDetailedMessage()}
        </div>
        {!error && !isComplete && (
          <div className="progress-indicator__submessage">
            {isOptimization 
              ? "Recherche du montant d'épargne optimal pour atteindre vos objectifs..."
              : "Veuillez patienter, le calcul peut prendre quelques instants..."}
          </div>
        )}
      </div>
    </div>
  );
}

