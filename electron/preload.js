'use strict';const{contextBridge}=require('electron');contextBridge.exposeInMainWorld('totemShell',{isElectron:true});
