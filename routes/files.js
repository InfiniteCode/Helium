
var express = require('express');
var nconf = require("nconf");
var router = express.Router();
var da = require('./../modules/data-access');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
    /*//Possible options
    encoding - sets encoding for the incoming form fields. Defaults to utf8.
    maxFieldsSize - Limits the amount of memory all fields (not files) can allocate in bytes. If this value is exceeded, an error event is emitted. The default size is 2MB.
    maxFields - Limits the number of fields that will be parsed before emitting an error event. A file counts as a field in this case. Defaults to 1000.
    maxFilesSize - Only relevant when autoFiles is true. Limits the total bytes accepted for all files combined. If this value is exceeded, an error event is emitted. The default is Infinity.
    autoFields - Enables field events and disables part events for fields. This is automatically set to true if you add a field listener.
    autoFiles - Enables file events and disables part events for files. This is automatically set to true if you add a file listener.
    uploadDir - Only relevant when autoFiles is true. The directory for placing file uploads in. You can move them later using fs.rename(). Defaults to os.tmpDir().
    */
var easyimg = require('easyimage');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var s3 = require('s3');
var s3c = s3.createClient({
    maxAsyncS3: 20,     // this is the default
    s3RetryCount: 3,    // this is the default
    s3RetryDelay: 1000, // this is the default
    multipartUploadThreshold: 20971520, // this is the default (20 MB)
    multipartUploadSize: 15728640, // this is the default (15 MB)
    s3Options: {
        accessKeyId: nconf.get("upload").s3.aws_access_key,
        secretAccessKey: nconf.get("upload").s3.aws_secret_key
    }
});

function typeFromContentType(contentType) {
    var lcType = contentType.toLowerCase();
    if(lcType.indexOf("image") >= 0) return 1;
    if(lcType.indexOf("video") >= 0) return 2;

    return 0;
}

router.post('/folder', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var folderName = req.body.folderName;
    var folderParent = req.body.parent ? parseInt(req.body.parent) : -1;

    if(folderName == "") {
        res.json({code: -2, message: "Not a valid folder object."});
        return;
    }

    var now = new Date();
    da.FolderFile.forge({
        created_on: now,
        modified_on: now,
        name: folderName,
        user: req.session.userId,
        'type': 1,  //Folder
        parent_folder: (folderParent == -1 ? null : folderParent),
        is_folder: true

    }).save().then(function(model){
        var folderId = model.id;
        res.json({
            code: 0,
            folder: {
                id: folderId,
                title: folderName,
                createdOn: now.getTime()
            }
        });
    });
});

router.get('/folder/:folder', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    da.FolderFile.findByUser(req.session.userId, function(m) {
        if(m == null)
            res.json({ code: 0, folders: [], files: [] });
        else {
            var folders = [], files = [];
            for(var i = 0, len = m.models.length; i < len; ++i)
                if(m.models[i].get("is_folder")[0])
                    folders.push(m.models[i].toPublicFormat());
                else
                    files.push(m.models[i].toPublicFormat());

            res.json({
                code: 0,
                folders: folders,
                files: files
            });
        }
    }, parseInt(req.params.folder));
});

router.delete('/folder/:folder', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var folderId = parseInt(req.params.folder);

    var folder = da.FolderFile.findById(folderId, function(f) {
        if(!f || f.get('user') != req.session.userId || !f.get('is_folder')[0])
            res.json({
                code: -1,
                message: "Invalid object."
            });
        else {
            //Move all folders and files from the folder to the upper level
            da.FolderFile.findByFolder(folderId, function(contents) {
                if(contents != null && contents.models.length > 0) {
                    //Grab ids from all models
                    var idsToMove = [];
                    for(var i = 0, len = contents.models.length; i < len; ++i)
                        idsToMove.push(contents.models[i].id);
                    da.FolderFile.moveFiles(idsToMove, f.get('parent_folder'), function(mc) {
                        da.FolderFile.deleteById(f.id, function(dc){
                            res.json({
                                code: 0,
                                message: "deleted",
                                reload: true,
                                folder: folderId
                            });
                        });
                    })
                } else
                    da.FolderFile.deleteById(f.id, function(dc){
                        res.json({
                            code: 0,
                            message: "deleted",
                            reload: false,
                            folder: folderId
                        });
                    });
            });
        }
    });
});

router.get('/folders', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    da.FolderFile.findByUser(req.session.userId, function(m) {
        if(m == null)
            res.json({ code: 0, folders: [], files: [] });
        else {
            var folders = [], files = [];
            for(var i = 0, len = m.models.length; i < len; ++i)
                if(m.models[i].get("is_folder")[0])
                    folders.push(m.models[i].toPublicFormat());
                else
                    files.push(m.models[i].toPublicFormat());

            res.json({
                code: 0,
                folders: folders,
                files: files
            });
        }
    });
});

router.post('/moveup', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var foldersList = req.body.folders ? req.body.folders : [];
    var filesList = req.body.files ? req.body.files: [];
    var entriesList = foldersList.concat(filesList);
    var fromFolder = req.body.from ? req.body.from : -1;
    if(entriesList.length == 0)
        res.json({
            code: -1,
            message: "No objects to move."
        });
    else {
        //Make sure this folder belongs to the user and find out its parent
        da.FolderFile.findById(fromFolder, function(m) {
            if(m == null || m.get('user') != req.session.userId)
                res.json({
                    code: -2,
                    message: "Invalid origin."
                });
            else {
                //We are ready now to update the entries
                da.FolderFile.moveFiles(entriesList, m.get('parent_folder'), function(d) {
                    if(d == null)
                        res.json({
                            code: -3,
                            message: "Move failed."
                        });
                    else
                        res.json({
                            code: 0
                        });
                });
            }
        });
    }
});

router.post('/movein', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var foldersList = req.body.folders ? req.body.folders : [];
    var filesList = req.body.files ? req.body.files: [];
    var entriesList = foldersList.concat(filesList);
    var intoFolder = req.body.in ? req.body.in : -1;
    if(entriesList.length == 0)
        res.json({
            code: -1,
            message: "No objects to move."
        });
    else {
        //Make sure this folder belongs to the user
        da.FolderFile.findById(intoFolder, function(m) {
            if(m == null || m.get('user') != req.session.userId || !m.get('is_folder')[0])
                res.json({
                    code: -2,
                    message: "Invalid destination."
                });
            else {
                //We are ready now to update the entries
                da.FolderFile.moveFiles(entriesList, intoFolder, function(d) {
                    if(d == null)
                        res.json({
                            code: -3,
                            message: "Move failed."
                        });
                    else
                        res.json({
                            code: 0
                        });
                });
            }
        });
    }
});

router.put('/rename', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var entryId = req.body.id;
    var newName = req.body.name;

    if(entryId && newName) {
        da.FolderFile.rename(entryId, newName, req.session.userId, function(d) {
            if(d == null)
                res.json({
                    code: -2,
                    message: "Rename failed."
                });
            else
                res.json({
                    code: 0
                });

        })
    } else
        res.json({
            code: -1,
            message: "Not a valid object."
        });
});

router.post('/:folder', multipartMiddleware, function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }
    //TODO: Make sure that folder belongs to the user

    var f = req.files.file
    var fileName = f.originalFilename;
    var fileTempPath = f.path;
    var fileSize = f.size;
    var fileType = typeFromContentType(f.type);
    var fileExt = fileName.split(".").pop();

    var now = new Date();
    var urlName = req.session.userId + "_" + req.params.folder + "_" + now.getTime() + "_" + Math.floor((Math.random() * 10000) + 1) + "." + fileExt;
    var relStoragePath = req.session.userId + "/" + req.params.folder;

    var dbStoragePath = null;
    var dbThumbStoragePath = null;
    var dbKey = null;
    var dbThumbKey = null;

    var finish = function(err) {
        if(err)
            res.status(400);
        else
            {
                da.FolderFile.forge({
                    key: dbKey,
                    name: fileName,
                    thumb_key: dbThumbKey,
                    url: dbStoragePath,
                    created_on: now,
                    modified_on: now,
                    size: fileSize,
                    user: req.session.userId,
                    'type': fileType,
                    parent_folder: (req.params.folder == "0" ? null : parseInt(req.params.folder)),
                    thumb_url: dbThumbStoragePath

                }).save().then(function(model) {
                    var fileId = model.id;
                    res.json({
                        code: 0,
                        file: {
                            id: fileId,
                            url: dbStoragePath,
                            thumbUrl: dbThumbStoragePath,
                            name: fileName,
                            contentType: fileType,
                            createdOn: now.getTime(),
                            modifiedOn: now.getTime(),
                            size: fileSize
                        }
                    });
                });
            }
    };

    var s3Upload = function(key, filePath) {
        var bucket = nconf.get("upload").s3.bucket;
        var params = {
            localFile: filePath,

            s3Params: {
                Bucket: nconf.get("upload").s3.bucket,
                Key: key,
                ACL: 'public-read'
            }
        };
        var uploader = s3c.uploadFile(params);
        uploader.on('error', function(err) {
            finish(err.stack);
            //console.error("unable to upload:", err.stack);
        });
        uploader.on('end', function(d) {
            dbStoragePath = s3.getPublicUrl(bucket, key);
            finish(null);
        });

        /*
         uploader.on('progress', function() {
         console.log("progress", uploader.progressAmount, uploader.progressTotal);
         });
         */
    };

    switch(nconf.get("upload").method)
    {
        case "disk": {
            var uploadDiskPath = nconf.get("upload").disk.path;
            var uploadDiskAccessPath = nconf.get("upload").disk.accessPath;

            dbStoragePath = uploadDiskAccessPath + "/" + relStoragePath + "/" + urlName;
            dbThumbStoragePath = dbStoragePath;
            var dirPath = path.join(appRoot, uploadDiskPath + "/" + relStoragePath);
            dbKey = dirPath + "/" + urlName;

            //Guarantee that folder exists
            if (!fs.existsSync(dirPath)) mkdirp.sync(dirPath);
            fs.renameSync(fileTempPath, dbKey);

            //TODO: Create a thumbnail
            /*
            dbThumbKey = dirPath + "/t_" + urlName;
            easyimg.thumbnail({
                src: dbKey,
                dst: dbThumbKey,
                width: 335,
                height: 223
            }).then(
                function(image) {
                    console.log('Thumbnailed: ' + image.width + ' x ' + image.height);
                },
                function (err) {
                    console.log(err);
                }
            );
            */

            finish();
        } break;

        case "s3": {
            dbThumbKey = null; //relStoragePath + "/t_" + urlName //TODO: Create and upload a thumbnail
            dbThumbStoragePath = null; //TODO: Upload a thumbnail

            dbKey = relStoragePath + "/" + urlName;
            s3Upload(dbKey, fileTempPath, finish);
        } break;
    }
});

router.delete('/:folder/:id', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var folderId = parseInt(req.params.folder);
    var fileId = parseInt(req.params.id);

    //TODO There might be issues if file is deleted but DB entry failed
    var finish = function() {
        da.FolderFile.deleteById(fileId, function(d) {
            res.json({
                code: 0,
                message: "deleted",
                file: {
                    id: fileId,
                    folder: folderId
                }
            });
        });
    };

    var s3Delete = function(key) {
        var bucket = nconf.get("upload").s3.bucket;
        var params = {
            Bucket: bucket,
            Delete: {
                Objects: [
                    {
                        Key: key
                    }
                ]

            }
        };

        var deleter = s3c.deleteObjects(params);
    };

    da.FolderFile.findById(fileId, function(d) {
        //Make sure file belongs to the user and its folder matches the provided folder
        if(d && d.get('user') == req.session.userId &&
            ((folderId >= 0 && d.get('parent_folder') || (folderId < 0 && d.get('parent_folder') == null))))
        {
            switch(nconf.get("upload").method)
            {
                case "disk":
                    fs.unlinkSync(d.get('key'));
                    if(d.get('thumb_key') != null) fs.unlinkSync(d.get('thumb_key'));
                    finish();
                    break;
                case "s3":
                    if(d.get('key') != null) s3Delete(d.get('key'));
                    if(d.get('thumb_key') != null) s3Delete(d.get('thumb_key'))
                    finish();
                    break;
            }
        } else
            res.json({
                code: -1,
                message: "Invalid file."
            });
    });
});

module.exports = router;
