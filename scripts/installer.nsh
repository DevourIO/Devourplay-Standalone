!macro customInstall
    ; Clear any existing update flag on fresh install
    DeleteRegValue HKCU "Software\DevourPlay" "UpdateInProgress"
!macroend

!macro customUnInstall
    ; Check if uninstaller was called with silent or automated parameters
    ${GetParameters} $R0
    DetailPrint "Uninstaller parameters: $R0"
    
    ; Check for silent/automated flags
    ${GetOptions} $R0 "/S" $R1  ; Silent flag
    IfErrors check_allusers 0
        DetailPrint "Silent uninstall detected, skipping cleanup"
        goto end_cleanup
    
    check_allusers:
    ${GetOptions} $R0 "/ALLUSERS" $R1  ; All users flag
    IfErrors check_frominstall 0
        DetailPrint "All users uninstall detected, skipping cleanup"
        goto end_cleanup
    
    check_frominstall:
    ${GetOptions} $R0 "/FROMINSTALL" $R1  ; Custom flag from installer
    IfErrors check_registry 0
        DetailPrint "Uninstall from installer detected, skipping cleanup"
        goto end_cleanup

    check_registry:
    ; Also check registry flag as backup
    ReadRegStr $0 HKCU "Software\DevourPlay" "UpdateInProgress"
    StrCmp $0 "1" skip_cleanup proceed_uninstall

    skip_cleanup:
        DetailPrint "Update in progress, skipping cleanup"
        DeleteRegValue HKCU "Software\DevourPlay" "UpdateInProgress"
        goto end_cleanup

    proceed_uninstall:
        DetailPrint "Manual uninstall detected - performing full cleanup"
        
        ; Disable auto-start before cleaning up files
        ExecWait '"$INSTDIR\DevourPlay.exe" --uninstall-cleanup --quit'
        
        RMDir /r "$APPDATA\devour"
        ExecShell "open" "https://google.com"

    end_cleanup:
!macroend