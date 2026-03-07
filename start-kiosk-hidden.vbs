Set WshShell = CreateObject("WScript.Shell")
' Run the batch file silently (0 means hidden window)
WshShell.Run chr(34) & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\start-kiosk.bat" & Chr(34), 0
Set WshShell = Nothing
