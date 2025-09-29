import PropTypes from "prop-types";

export const ItemMenuActionsShape = PropTypes.shape({
    showDetail: PropTypes.func.isRequired,
    display: PropTypes.func,
    rename: PropTypes.func.isRequired,
    move: PropTypes.func.isRequired,
    copy: PropTypes.func,
    download: PropTypes.func.isRequired,
    create_symlink: PropTypes.func,
    permission: PropTypes.func,
    accessControl: PropTypes.func,
    share: PropTypes.func,
    remove: PropTypes.func.isRequired,
});

export const UploadMenuActionsShape = PropTypes.shape({
    upload: PropTypes.func.isRequired,
    create: PropTypes.func.isRequired,
    create_symlink: PropTypes.func.isRequired,
});

export const SelectedMenuActionsShape = PropTypes.shape({
    download: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
    move: PropTypes.func.isRequired,
    archive: PropTypes.func,
});
