"C:\Program Files\7-Zip\7zg" a -tzip tunnel.zip index.html package.json web
copy /b ..\nwjs\nw.exe+tunnel.zip ssh-tunnel\ssh-tunnel.exe 

pause