
(function() {
    var filesModule = angular.module("hel-files", ['hel-services']);

    filesModule.directive("helFilesSelector", ["hel-files-service", function(filesService) {
        return {
            restrict: 'E',
            templateUrl: "/templates/files/selector.html",
            scope: {
                targetInput: "=targetInput"
            },
            controller: function($scope){
                var cThis = this;
                this.filesService = filesService;
                this.currentPath = [];

                this.currentFolder = function() {
                    return this.filesService.getFolder(this.currentPath);
                };

                this.folderGoIn = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    this.currentPath.push(id);
                    this.filesService.getUserFolder(this.currentPath);
                };

                this.folderGoUp = function($event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    this.currentPath.pop();
                };

                this.selectFile = function(file) {
                    var targetInputName = "filesImageUrlInput";//hardcoded for now
                    var targetEl = $("#" + targetInputName);
                    targetEl.val(file.url);
                    targetEl.focus();
                    targetEl.select();
                };
            },
            controllerAs: "filesSelectorCtrl"
        };
    }]);

    filesModule.directive("helFilesUploadModal", ["hel-files-service", function(filesService) {
        return {
            restrict: 'E',
            templateUrl: "/templates/modals/files_upload.html",
            controller: function($scope){
                var cThis = this;
                this.uploadPath = null;
                this.errorMessage = null;
                this.disable = false;
                this.filesService = filesService;
                this.dropZone = null;

                this.modal = function(args){
                    $("#uploadFilesModal").modal(args);
                };

                this.closed = function() {
                    if(cThis.disable) return;
                    cThis.modal("hide");
                };

                this.showPreview = function() {
                    return $('#filesUploadPreview').children().length > 0;
                };

                this.init = function() {
                    var previewNode = document.querySelector("#filesUploadPreviewTemplate");
                    previewNode.id = "";
                    this.previewTemplate = previewNode.parentNode.innerHTML;
                    previewNode.parentNode.removeChild(previewNode);
                };

                $scope.$on('showFilesUploadModal', function(event, args) {
                    cThis.uploadPath = args;
                    cThis.uploadFolder = args.length == 0 ? 0 : args[args.length - 1];
                    cThis.errorMessage = null;
                    if(cThis.dropZone != null) cThis.dropZone.destroy();
                    cThis.dropZone = new Dropzone("#filesUploadArea",
                        {
                            url: "/files/" + cThis.uploadFolder,
                            method: "POST",
                            parallelUploads: 10,
                            paramName: "file", // The name that will be used to transfer the file
                            maxFilesize: 12, // MB
                            previewsContainer: "#filesUploadPreview",
                            autoQueue: false,
                            thumbnailWidth: 80,
                            thumbnailHeight: 80,
                            previewTemplate: cThis.previewTemplate,
                            acceptedFiles: "image/*",
                            accept: function(file, done) {
                                    /*var indexOfExt = file.lastIndexOf(".")
                                    var fileExt = file.substr(  + 2);
                                    fileExt = fileExt.toLowerCase();
                                    if(fileExt != "png" && fileExt != "jpg" && fileExt != "jpeg" && fileExt != "gif" &&
                                        fileExt != "bmp")
                                        done("Not a valid image file.");
                                    else*/
                                        done();
                                }
                        });
                    Dropzone.autoDiscover = false;

                    cThis.dropZone.on("addedfile", function(file) {
                        $scope.$apply(function(){
                            file.previewElement.querySelector(".start").onclick = function() { cThis.dropZone.enqueueFile(file); };
                        });
                    });

                    cThis.dropZone.on("removedfile", function(file) {
                        $scope.$apply(function(){
                            cThis.showPreview();
                        });
                    });

                    cThis.dropZone.on("canceled", function(file) {
                        $scope.$apply(function(){
                            cThis.showPreview();
                        });
                    });

                    cThis.dropZone.on("sending", function(file) {
                        $scope.$apply(function(){
                            file.previewElement.querySelector(".start").setAttribute("disabled", "disabled");
                            cThis.disable = true;
                        });
                    });

                    cThis.dropZone.on("queuecomplete", function(progress) {
                        $scope.$apply(function(){
                            cThis.disable = false;
                        });
                    });

                    cThis.dropZone.on("success", function(file, response) {
                        if(response.code == 0) {
                            cThis.filesService.addFile(cThis.uploadPath, response.file);
                        }
                    });

                    cThis.dropZone.on("error", function(file, response) {
                        //Failed
                    });

                    cThis.modal({
                        backdrop: 'static',
                        keyboard: false
                    });
                });

                this.init();
            },
            controllerAs: "uploadFilesCtrl"
        };
    }]);

    filesModule.directive("helFilesNewFolderModal", ["hel-files-service", function(filesService) {
        return {
            restrict: 'E',
            templateUrl: "/templates/modals/files_folder_new.html",
            controller: function($scope){
                var cThis = this;
                this.parentId = null;
                this.folderName = "";
                this.errorMessage = null;
                this.disable = false;
                this.filesService = filesService;

                this.modal = function(args){
                    $("#newFilesFolderModal").modal(args);
                };

                this.cancelled = function() {
                    $scope.$emit('newFilesFolderCancelled');
                    cThis.modal("hide");
                };

                this.onCreated = function(data) {
                    $scope.$emit('newFilesFolderCreated', this.folderName);
                    cThis.modal("hide");
                    cThis.disable = false;
                };

                this.onFailed = function(data) {
                    cThis.errorMessage = data.message;
                    cThis.disable = false;
                };

                this.confirmed = function() {
                    this.disable = true;
                    //TODO http://stackoverflow.com/questions/16152073/prevent-bootstrap-modal-from-disappearing-when-clicking-outside-or-pressing-esca
                    this.filesService.createFolder(this.folderName, this.parentPath, this.onCreated, this.onFailed);
                };

                $scope.$on('showNewFilesFolderModal', function(event, args) {
                    cThis.folderName = "";
                    cThis.errorMessage = null;
                    cThis.parentPath = args;
                    cThis.modal({
                        backdrop: 'static',
                        keyboard: false
                    });
                });
            },
            controllerAs: "newFilesFolderCtrl"
        };
    }]);

    filesModule.directive("helFilesRenameItemModal", ["hel-files-service", function(filesService) {
        return {
            restrict: 'E',
            templateUrl: "/templates/modals/files_rename.html",
            controller: function($scope){
                var cThis = this;
                this.itemId = null;
                this.itemName = "";
                this.errorMessage = null;
                this.disable = false;
                this.filesService = filesService;

                this.modal = function(args){
                    $("#renameFilesItemModal").modal(args);
                };

                this.cancelled = function() {
                    $scope.$emit('renameFilesItemCancelled');
                    cThis.modal("hide");
                };

                this.onRenamed = function(data) {
                    $scope.$emit('filesItemRenamed', this.folderName);
                    cThis.modal("hide");
                    cThis.disable = false;
                };

                this.onFailed = function(data) {
                    cThis.errorMessage = data.message;
                    cThis.disable = false;
                };

                this.confirmed = function() {
                    this.disable = true;
                    //TODO http://stackoverflow.com/questions/16152073/prevent-bootstrap-modal-from-disappearing-when-clicking-outside-or-pressing-esca
                    this.filesService.renameItem(this.parentPath, this.itemId, this.isFolder, this.itemName, this.onRenamed, this.onFailed);
                };

                $scope.$on('showRenameFilesItemModal', function(event, args) {
                    cThis.isFolder = args.isFolder;
                    cThis.itemId = args.itemId;
                    cThis.itemName = args.itemName;
                    cThis.errorMessage = null;
                    cThis.parentPath = args.parentPath;
                    cThis.modal({
                        backdrop: 'static',
                        keyboard: false
                    });
                });
            },
            controllerAs: "renameFilesItemCtrl"
        };
    }]);

    filesModule.directive("helFiles", ["$http", "$timeout", "hel-user-service", "hel-files-service", "hel-navbar-service",
    function($http, $timeout, userService, filesService, navbarService){
        return {
            restrict: "E",
            templateUrl: "/templates/files/files.html",
            controller: function($scope){
                var ctrlT = this;
                this.userService = userService;
                this.navbarService = navbarService;
                this.filesService = filesService;
                this.currentFolderPath = [];
                this.editMode = false;
                this.selectedFolders = [];
                this.selectedFiles = [];

                this.isFolderSelected = function(id) {
                    return this.selectedFolders.indexOf(id) != -1;
                };

                this.isFileSelected = function(id) {
                    return this.selectedFiles.indexOf(id) != -1;
                };

                this.getCurFolderPathNames = function() {
                    var pathFolders = [];

                    var curFolder = this.filesService.files;
                    for(var i = 0; i < this.currentFolderPath.length; ++i) {
                        curFolder = this.filesService.getFolderByID(curFolder.folders, this.currentFolderPath[i]);
                        pathFolders.push(curFolder)
                    }

                    return pathFolders;
                };

                this.lastInPath = function(id) {
                    return id == this.currentFolderPath[this.currentFolderPath.length - 1];
                };

                this.getFileSizeStr = function(size) {
                    var res;
                    if (size >= 1024 * 1024 * 1024 * 1024 / 10) {
                        size = size / (1024 * 1024 * 1024 * 1024 / 10);
                        res = "TB";
                    } else if (size >= 1024 * 1024 * 1024 / 10) {
                        size = size / (1024 * 1024 * 1024 / 10);
                        res = "GB";
                    } else if (size >= 1024 * 1024 / 10) {
                        size = size / (1024 * 1024 / 10);
                        res = "MB";
                    } else if (size >= 1024 / 10) {
                        size = size / (1024 / 10);
                        res = "KB";
                    } else {
                        size = size * 10;
                        res = "b";
                    }
                    return (Math.round(size) / 10) + " " + res;
                };

                this.folderGoUpTill = function(id) {
                    this.currentFolderPath = this.currentFolderPath.slice(0, this.currentFolderPath.indexOf(id) + 1);
                    this.selectedFolders = [];
                    this.selectedFiles = [];
                };

                this.folderGoUp = function() {
                    this.currentFolderPath.pop();
                    this.selectedFolders = [];
                    this.selectedFiles = [];
                };

                this.enterFolder = function(id) {
                    this.currentFolderPath.push(id);
                    this.filesService.getUserFolder(this.currentFolderPath);
                    this.selectedFolders = [];
                    this.selectedFiles = [];
                };

                this.newFolder = function() {
                    $scope.$emit('showNewFilesFolderModal', this.currentFolderPath);
                };

                this.uploadFiles = function(id, $event) {
                    var uploadPath = this.currentFolderPath.slice(0);
                    if(id != null) uploadPath.push(id);
                    $event.preventDefault();
                    $event.stopPropagation();
                    $scope.$emit('showFilesUploadModal', uploadPath);

                };

                this.onDeleteFolderSuccess = function(data) {

                };

                this.onDeleteFolderFailure = function(data) {

                };

                this.onDeleteFileSuccess = function(data) {

                };

                this.onDeleteFileFailure = function(data) {

                };

                this.deleteFolder = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    this.filesService.deleteFolder(this.currentFolderPath, id,
                        this.onDeleteFolderSuccess, this.onDeleteFolderFailure);
                };

                this.deleteFile = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    this.filesService.deleteFile(this.currentFolderPath, id,
                        this.onDeleteFileSuccess, this.onDeleteFileFailure);
                };

                this.unselectFolder = function(id) {
                    this.selectedFolders = $.grep(this.selectedFolders, function(e){ return e != id; });
                };

                this.unselectFile = function(id) {
                    this.selectedFiles = $.grep(this.selectedFiles, function(e){ return e != id; });
                };

                this.selectFolder = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    if(this.isFolderSelected(id)) {
                        this.unselectFolder(id);
                    } else {
                        this.selectedFolders.push(id);
                    }
                };

                this.selectFile = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    if(this.isFileSelected(id)) {
                        this.unselectFile(id);
                    } else {
                        this.selectedFiles.push(id);
                    }
                };

                this.moveSelectedUp = function($event) {
                    this.filesService.moveItemsUp(this.currentFolderPath, this.selectedFolders, this.selectedFiles);
                };

                this.moveFolderUp = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    this.moveSelectedUp();
                };

                this.moveFileUp = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    this.moveSelectedUp();
                };

                this.moveIntoFolder = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    this.filesService.moveItemsIn(this.currentFolderPath, this.selectedFolders, this.selectedFiles, id);
                };

                this.shareFolder = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    window.alert("Not Implemented");
                };

                this.shareFile = function(id, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    window.alert("Not Implemented");
                };

                this.renameFile = function(id, name, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    $scope.$emit('showRenameFilesItemModal',
                        {
                            isFolder: false,
                            itemId: id,
                            itemName: name,
                            parentPath: this.currentFolderPath
                        });
                };

                this.renameFolder = function(id, name, $event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    $scope.$emit('showRenameFilesItemModal',
                        {
                            isFolder: true,
                            itemId: id,
                            itemName: name,
                            parentPath: this.currentFolderPath
                        });
                };

                this.getThumbUrl = function(file) {
                    return  file.thumbUrl == null ? file.url : file.thumbUrl;
                };

                this.filesService.getUserFolders();
            },
            controllerAs: "filesCtrl"
        };
    }]);

})();