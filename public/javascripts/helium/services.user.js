
//Services
(function() {
    var services = angular.module("hel-services");

    services.service("hel-files-service", ["$http", function($http) {
        var sThis = this;
        this.files = { id: -1 };

        this.getUserFolders = function() {
            this.getUserFolder(null);
        };

        this.getUserFolder = function(path) {
            var fetchFolder = path == null ? this.files : this.getFolder(path);
            if(fetchFolder.fetching == true || typeof fetchFolder.folders != 'undefined') return;

            fetchFolder.fetching = true;
            $http.get(path == null || path.length == 0 ? '/files/folders' : ('/files/folder/' + fetchFolder.id)).
                success(function(data, status, headers, config) {
                    fetchFolder.fetching = false;
                    if(data.code == 0) {
                        fetchFolder.folders = data.folders;
                        fetchFolder.files = data.files;
                    } else {
                        $.notify("Folder fetching failed. Code " + data.code + ". " + data.message, {globalPosition: 'top center', className: 'error'});
                    }
                }).
                error(function(data, status, headers, config) {
                    fetchFolder.fetching = false;
                    $.notify("Folder fetching failed. Code " + status, {globalPosition: 'top center', className: 'error'});
                });
        };

        this.getFolderByID = function(folders, id) {
            if(typeof folders == 'undefined' || folders == null) return null;
            var grepRes = $.grep(folders, function(e) { return e.id == id});
            return grepRes.length > 0 ? grepRes[0] : null;
        };

        this.getFolderByTitle = function(folders, title) {
            if(typeof folders == 'undefined' || folders == null) return null;
            var grepRes = $.grep(folders, function(e) { return e.title == title});
            return grepRes.length > 0 ? grepRes[0] : null;
        };

        this.getFolder = function(path){
            if(typeof path == 'number') {
                path = [path];
            } else
            if(path.length == 0) return this.files;

            var recurFolder = this.files;
            for(var i = 0; i < path.length; ++i) {
                recurFolder = this.getFolderByID(recurFolder.folders, path[i]);
                if(recurFolder == null) break;
            }
            return recurFolder;
        };

        this.createFolder = function(name, parentPath, onSuccess, onFailure){
            var parentFolder = this.getFolder(parentPath);

            if(this.getFolderByTitle(parentFolder.folders, name) != null) {
                onFailure( {
                    message: "Folder with this name already exists."
                });
            } else
                $http.post('/files/folder', { folderName: name, parent: parentFolder.id }).
                    success(function(data, status, headers, config) {
                        if(data.code == 0) {
                            if(typeof parentFolder.folders == 'undefined') parentFolder.folders = [];
                            parentFolder.folders.push(data.folder);
                            onSuccess(data);
                        } else {
                            onFailure(data);
                        }
                    }).
                    error(function(data, status, headers, config) {
                        onFailure(data);
                    });
        };

        this.addFile = function(path, file) {
            var folder = this.getFolder(path);
            //Maybe file is added to a folder that we haven't fetched yet, then just ignore this request
            if(typeof folder.folders == 'undefined') return;
            folder.files.push(file);
        };

        this.deleteFolder = function(parentPath, id, onSuccess, onFailure) {
            var parentFolder = this.getFolder(parentPath);

            $http.delete('/files/folder/' + id).
                success(function(data, status, headers, config) {
                    if(data.code == 0) {
                        parentFolder.folders = $.grep(parentFolder.folders, function(e) { return e.id != id});
                        if(data.reload) {
                            //We need to initiate reloading of the parent folder, because it is dirty now
                            delete parentFolder.folders;
                            delete parentFolder.files;

                            sThis.getUserFolder(parentPath);
                        }
                        onSuccess(data);
                    } else {
                        onFailure(data);
                    }
                }).
                error(function(data, status, headers, config) {
                    onFailure(data);
                });
        };

        this.deleteFile = function(parentPath, id, onSuccess, onFailure) {
            var parentFolder = this.getFolder(parentPath);

            $http.delete('/files/' + parentFolder.id + '/' + id).
                success(function(data, status, headers, config) {
                    if(data.code == 0) {
                        parentFolder.files = $.grep(parentFolder.files, function(e) { return e.id != id});
                        onSuccess(data);
                    } else {
                        onFailure(data);
                    }
                }).
                error(function(data, status, headers, config) {
                    onFailure(data);
                });
        };

        this.moveItemsUp = function(parentPath, folders, files, onSuccess, onFailure) {
            onSuccess = typeof onSuccess == 'undefined' ? function(){} : onSuccess;
            onFailure = typeof onFailure == 'undefined' ? function(){} : onFailure;
            var parentFolder = this.getFolder(parentPath);
            var pathCopy = parentPath.slice(0); pathCopy.pop();
            var moveToFolder = this.getFolder(pathCopy);

            $http.post('/files/moveup', { folders: folders, files: files, from: parentFolder.id}).
                success(function(data, status, headers, config) {
                    if(data.code == 0) {
                        var foldersObjs = $.grep(parentFolder.folders, function(e) { return folders.indexOf(e.id) != -1; });
                        var filesObjs = $.grep(parentFolder.files, function(e) { return files.indexOf(e.id) != -1; });
                        parentFolder.folders = $.grep(parentFolder.folders, function(e) { return folders.indexOf(e.id) == -1; });
                        parentFolder.files = $.grep(parentFolder.files, function(e) { return files.indexOf(e.id) == -1; });
                        moveToFolder.folders = moveToFolder.folders.concat(foldersObjs);
                        moveToFolder.files = moveToFolder.files.concat(filesObjs);
                        onSuccess(data);
                    } else {
                        onFailure(data);
                    }
                }).
                error(function(data, status, headers, config) {
                    onFailure(data);
                });

        }

        this.moveItemsIn = function(parentPath, folders, files, moveInto) {
            onSuccess = typeof onSuccess == 'undefined' ? function(){} : onSuccess;
            onFailure = typeof onFailure == 'undefined' ? function(){} : onFailure;
            var parentFolder = this.getFolder(parentPath);
            var pathCopy = parentPath.slice(0);
            pathCopy.push(moveInto);
            var moveToFolder = this.getFolder(pathCopy);

            $http.post('/files/movein', { folders: folders, files: files, in: moveInto}).
                success(function(data, status, headers, config) {
                    if(data.code == 0) {
                        var foldersObjs = $.grep(parentFolder.folders, function(e) { return folders.indexOf(e.id) != -1; });
                        var filesObjs = $.grep(parentFolder.files, function(e) { return files.indexOf(e.id) != -1; });
                        parentFolder.folders = $.grep(parentFolder.folders, function(e) { return folders.indexOf(e.id) == -1; });
                        parentFolder.files = $.grep(parentFolder.files, function(e) { return files.indexOf(e.id) == -1; });
                        //Make sure this folder was fetched already for all items, before pushing moved ones
                        if(typeof moveToFolder.folders != 'undefined') {
                            moveToFolder.folders = moveToFolder.folders.concat(foldersObjs);
                            moveToFolder.files = moveToFolder.files.concat(filesObjs);
                        }
                        onSuccess(data);
                    } else {
                        onFailure(data);
                    }
                }).
                error(function(data, status, headers, config) {
                    onFailure(data);
                });
        }

        this.renameItem = function(parentPath, id, isFolder, name, onSuccess, onFailure) {
            onSuccess = typeof onSuccess == 'undefined' ? function(){} : onSuccess;
            onFailure = typeof onFailure == 'undefined' ? function(){} : onFailure;
            var parentFolder = this.getFolder(parentPath);

            $http.put('/files/rename', { id: id, name: name }).
                success(function(data, status, headers, config) {
                    if(data.code == 0) {
                        if(isFolder) {
                            var folderObj = sThis.getFolderByID(parentFolder.folders, id);
                            folderObj.title = name;
                        } else {
                            var fileObj = sThis.getFolderByID(parentFolder.files, id);
                            fileObj.name = name;
                        }

                        onSuccess(data);
                    } else {
                        onFailure(data);
                    }
                }).
                error(function(data, status, headers, config) {
                    onFailure(data);
                });
        }
    }]);
})();