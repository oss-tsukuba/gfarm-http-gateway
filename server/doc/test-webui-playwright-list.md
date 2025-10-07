# Frontend Playwright Test List (20250829)

## acl.test.js
- Should display all ACL entries for a file
- Should add a new ACL entry
- Should add a new default ACL entry for a directory
- Should remove the selected ACL entry from the list
- Should display error notification when ACL update fails

## copy.test.js
- Should copy a file and display progress until completion
- Should cancel an ongoing copy operation and show cancellation message

## create.dir.test.js
- Should create a new directory from the New menu
- Should display an error notification when directory creation fails

## create.symlink.test.js
- Should create a symbolic link to a file from the New menu
- Should create a symbolic link to a directory from the context menu
- Should display an error notification when symlink creation fails

## delete.test.js
- Should delete a single file from the context menu
- Should delete multiple files from the actions menu
- Should display an error notification when file deletion fails

## detailview.test.js
- Should display file name in the details panel
- Should display file type in the details panel
- Should display file size in the details panel
- Should display permissions in the details panel
- Should display last access time in the details panel
- Should display last modified time in the details panel
- Should display change time in the details panel
- Should display file owner (UID) in the details panel
- Should display file group (GID) in the details panel
- Should display cksum in the details panel

## download.test.js
- Should download a single file from the context menu
- Should download multiple selected files as a ZIP from the actions menu
- Should download a single directory as a ZIP from the context menu
- Should download multiple directories as a ZIP from the actions menu
- Should download an empty file with 0 bytes
- Should display an error when trying to download a nonexistent file

## filelistview.test.js
- Should display the file list when accessing an existing path
- Should show an error message when accessing a nonexistent path
- Should display a long file list correctly
- Should sort files by name (ascending and descending)
- Should sort files by size (ascending and descending)
- Should sort files by updated date (ascending and descending)
- Should filter files by extension (.txt)
- Should filter files by modified date using all available options
- Should display the current directory path in breadcrumb navigation
- Should open a file in a new tab when double-clicked
- Should navigate into a directory when double-clicked
- Should navigate back and forward between directories
- Should automatically redirect to the home directory when accessing the root URL

## gfptar.test.js
- Should create an archive from selected files
- Should update an existing archive with selected files
- Should append files to an existing archive
- Should retrieve archive members for extraction
- Should extract files from an archive to the specified directory
- Should display an error and show task status when tar operation fails

## login.test.js
- Should display the login title on the login page
- Should display the login button for OIDC
- Should log in via OIDC and show the file list
- Should log out and redirect to the login screen
- [Android] Should trigger install prompt when A2HS button is clicked
- [iOS] Should show instructions modal when A2HS button is clicked
- [Desktop] Should hide A2HS button

## move.test.js
- Should move a single file from the context menu
- Should move multiple files from the actions menu
- Should show name conflict prompt when destination has duplicate files
- Should display an error notification when move operation fails

## permission.test.js
- Should update file permissions using the octal input
- Should apply the sticky bit when updating a directory's permissions
- Should display an error notification when permission update fails

## rename.test.js
- Should rename a file from the context menu
- Should display an error notification when file rename fails

## upload.test.js
- Should upload a single file using the upload dialog
- Should upload multiple files using the upload dialog
- Should upload a nested directory using the folder upload dialog
- Should overwrite existing file on name conflict
- Should skip upload and keep existing file
- Should upload file with new name to avoid conflict
- Should handle name conflict by canceling the upload
- Should upload an empty file and complete the task
- Should upload a file via drag-and-drop and confirm in the modal
- Should display an error and show task status when upload fails
- Should cancel an ongoing upload and display cancellation status

## url.test.js
- Should display the WebUI link in the URL tab
- Should display the download link and allow access to the file via URL
- Should display the API resource URL for the selected file

