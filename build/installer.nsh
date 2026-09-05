; TanaClean 2035 — Script NSIS personnalisé
; Ajouté automatiquement par electron-builder via nsis.include

!macro customHeader
  ; Titre de la fenêtre d'installation
  Name "TanaClean 2035"
!macroend

!macro customInstall
  ; Créer le raccourci Bureau
  CreateShortCut "$DESKTOP\TanaClean 2035.lnk" "$INSTDIR\TanaClean 2035.exe"
!macroend

!macro customUnInstall
  ; Supprimer le raccourci Bureau à la désinstallation
  Delete "$DESKTOP\TanaClean 2035.lnk"
!macroend
