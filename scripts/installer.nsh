!macro customInstall
    ; Clear any existing update flag on fresh install
    DeleteRegValue HKCU "Software\DevourPlay" "UpdateInProgress"
!macroend

!macro customUnInstall
    ; Check registry flag for update in progress
    ReadRegStr $0 HKCU "Software\DevourPlay" "UpdateInProgress"
    StrCmp $0 "1" 0 proceed_uninstall
        DetailPrint "Update in progress flag detected, skipping cleanup..."
        ; Clear the flag since update is completing
        DeleteRegValue HKCU "Software\DevourPlay" "UpdateInProgress"
        goto end_cleanup

    proceed_uninstall:
    ; No update detected, proceed with full cleanup
    DetailPrint "Performing full uninstall cleanup..."

    ; Run Node.js cleanup script before uninstalling
    ; ExecWait '"$INSTDIR\node.exe" "$INSTDIR\scripts\cleanup-script.js"'

    ; Remove app data
    RMDir /r "$APPDATA\devour"

    ExecShell "open" "https://google.com"

    end_cleanup:
!macroend

