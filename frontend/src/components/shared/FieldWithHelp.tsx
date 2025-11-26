/**
 * Composant réutilisable pour afficher un champ avec tooltip d'aide et exemple.
 * 
 * Combine un TextField/Select avec un tooltip explicatif et un exemple de valeur.
 */

import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import { HelpOutline } from "@mui/icons-material";
import type { ReactNode } from "react";

interface FieldWithHelpProps extends Omit<TextFieldProps, "helperText"> {
  helpText?: string;
  exampleText?: string;
  customHelperText?: ReactNode;
}

export function FieldWithHelp({
  helpText,
  exampleText,
  customHelperText,
  ...textFieldProps
}: FieldWithHelpProps) {
  const hasHelp = !!helpText;
  
  // Construire le helperText avec exemple et aide
  const helperTextParts: ReactNode[] = [];
  
  if (exampleText) {
    helperTextParts.push(
      <Typography key="example" component="span" variant="caption" sx={{ display: "block", mb: 0.5 }}>
        <strong>Exemple :</strong> {exampleText}
      </Typography>
    );
  }
  
  if (customHelperText) {
    helperTextParts.push(customHelperText);
  }
  
  const finalHelperText = helperTextParts.length > 0 ? (
    <Box sx={{ mt: 0.5 }}>{helperTextParts}</Box>
  ) : undefined;

  return (
    <Box sx={{ position: "relative" }}>
      {hasHelp && (
        <Tooltip
          title={helpText}
          arrow
          placement="top"
          sx={{ position: "absolute", right: 8, top: 8, zIndex: 1 }}
        >
          <IconButton
            size="small"
            sx={{
              position: "absolute",
              right: 4,
              top: 4,
              zIndex: 1,
              color: "text.secondary",
              "&:hover": {
                color: "primary.main",
              },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <HelpOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <TextField
        {...textFieldProps}
        helperText={finalHelperText}
                  sx={{
                    ...textFieldProps.sx,
                    ...(hasHelp && {
                      "& .MuiInputBase-root": { paddingRight: "40px" },
                    }),
                  }}
      />
    </Box>
  );
}

