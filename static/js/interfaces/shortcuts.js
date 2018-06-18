
function Shortcut () {}

Shortcut.initialize = function () {
    Shortcut.shortcut_mapping = {
        project_page: {
            default: 'dvs',
            dvs: {
                create_summernote: {
                    name: 'Create Concept',
                    binding: ['enter'],
                    callback: ConceptEventListener.createShortcut,
                    preventDefault: true,
                    description: ''
                },
                create_link: {
                    name: 'Create Link Concept',
                    binding: ['ctrl+enter'],
                    callback: ConceptEventListener.createLinkShortcut,
                    preventDefault: true,
                    description: ''
                },
                create_image: {
                    name: 'Create Image Concept',
                    binding: ['ctrl+alt+enter'],
                    callback: ConceptEventListener.createImageShortcut,
                    preventDefault: true,
                    description: ''
                },
                edit_phrasing: {
                    name: 'Edit Phrasing',
                    binding: ['esc'],
                    callback: PhrasingEventListener.editShortcut,
                    preventDefault: true,
                    description: ''
                },
                create_phrasing: {
                    name: 'Create Phrasing',
                    binding: ['shift+enter'],
                    callback: PhrasingEventListener.createShortcut,
                    preventDefault: true,
                    description: ''
                },
                delete_phrasing: {
                    name: 'Delete Phrasing',
                    binding: ['backspace'],
                    callback: PhrasingEventListener.deleteShortcut,
                    preventDefault: true,
                    description: ''
                },
                delete_concept: {
                    name: 'Delete Concept',
                    binding: ['del'],
                    callback: ConceptEventListener.deleteShortCut,
                    preventDefault: true,
                    description: ''
                },
                create_document: {
                    name: 'Create Document',
                    binding: ['ctrl+alt+d'],
                    callback: DocumentEventListener.createShortcut,
                    preventDefault: true,
                    description: ''
                },
                activate_down: {
                    name: 'Activate Next Concept',
                    binding: ['down'],
                    callback: ConceptEventListener.activeShortcutDown,
                    preventDefault: true,
                    description: 'Activate the next Concept'
                },
                activate_up: {
                    name: 'Activate Previous Concept',
                    binding: ['up'],
                    callback: ConceptEventListener.activeShortcutUp,
                    preventDefault: true,
                    description: 'Activate Previous Concept'
                },
                activate_left: {
                    name: 'Activate Parent Concept',
                    binding: ['left'],
                    callback: ConceptEventListener.activeShortcutLeft,
                    preventDefault: true,
                    description: 'Activate Parent Concept, or collapse current parent'
                },
                activate_right: {
                    name: 'Activate Child Concept',
                    binding: ['right'],
                    callback: ConceptEventListener.activeShortcutRight,
                    preventDefault: true,
                    description: 'Activate Child Concept, or expand current parent'
                },
                move_concept_down: {
                    name: 'Move Concept Down',
                    binding: ['ctrl+down'],
                    callback: ConceptEventListener.moveShortcutDown,
                    preventDefault: true,
                    description: ''
                },
                move_concept_up: {
                    name: 'Move Concept Up',
                    binding: ['ctrl+up'],
                    callback: ConceptEventListener.moveShortcutUp,
                    preventDefault: true,
                    description: ''
                },
                move_concept_left: {
                    name: 'Move Concept Left',
                    binding: ['ctrl+left', 'shift+tab'],
                    callback: ConceptEventListener.moveShortcutLeft,
                    preventDefault: true,
                    description: ''
                },
                move_concept_right: {
                    name: 'Move Concept Right',
                    binding: ['ctrl+right', 'tab'],
                    callback: ConceptEventListener.moveShortcutRight,
                    preventDefault: true,
                    description: ''
                },
                change_phrasing_previous: {
                    name: 'Change Phrasing to Previous',
                    binding: ['shift+up'],
                    callback: SelectedPhrasingEventListener.changeShortcutUp,
                    preventDefault: true,
                    description: ''
                },
                change_phrasing_next: {
                    name: 'Change Phrasing to Next',
                    binding: ['shift+down'],
                    callback: SelectedPhrasingEventListener.changeShortcutDown,
                    preventDefault: true,
                    description: ''
                },
                create_comment: {
                    name: 'Create Comment',
                    binding: ['ctrl+alt+c'],
                    callback: Annotation.newFromCurrentConcept,
                    preventDefault: true,
                    description: ''
                },
                toggle_pvs: {
                    name: 'Toggle Properties View',
                    binding: ['ctrl+alt+x'],
                    callback: PVS.toggleOpenState,
                    preventDefault: true,
                    description: ''
                },
                change_document_previous: {
                    name: 'Change Document to Previous',
                    binding: ['shift+left'],
                    callback: DocumentEventListener.activateShortcutLeft,
                    preventDefault: true,
                    description: ''
                },
                change_document_next: {
                    name: 'Change Document to Next',
                    binding: ['shift+right'],
                    callback: DocumentEventListener.activateShortcutRight,
                    preventDefault: true,
                    description: ''
                },
                toggle_concept_visibility: {
                    name: 'Toggle Concept Visibility',
                    binding: [],
                    callback: CrawlcontextEventListener.hideToggleShortcut,
                    preventDefault: true,
                    description: ''
                },
                toggle_ordered_list: {
                    name: 'Toggle Ordered List',
                    binding: ['ctrl+o'],
                    callback: AttributeEventListener.toggleOrderedListShortCut,
                    preventDefault: true,
                    description: ''
                },
                toggle_unordered_list: {
                    name: 'Toggle Unordered List',
                    binding: ['ctrl+u'],
                    callback: AttributeEventListener.toggleUnorderedListShortCut,
                    preventDefault: true,
                    description: ''
                },
                toggle_header: {
                    name: 'Toggle Header',
                    binding: ['ctrl+h'],
                    callback: AttributeEventListener.toggleHeaderShortCut,
                    preventDefault: true,
                    description: ''
                },
                toggle_images: {
                    name: 'Toggle Images',
                    binding: ['ctrl+i'],
                    callback: DVS.toggleImages,
                    preventDefault: true,
                    description: ''
                },
                print: {
                    name: 'Print Document',
                    binding: ['ctrl+p'],
                    callback: DocumentEventListener.printShortCut,
                    preventDefault: true,
                    description: ''
                },
                search: {
                    name: 'Search',
                    binding: ['ctrl+f', '/'],
                    callback: ProjectSearch.focusSearch,
                    preventDefault: true,
                    description: ''
                },
                show_keybindings: {
                    name: 'Show Keybindings',
                    binding: ['ctrl+k'],
                    callback: Shortcut.nop,
                    preventDefault: true,
                    description: ''
                }
            },
            dvs_pres: {
                delete_concept: {
                    name: 'Delete Concept',
                    binding: ['del'],
                    callback: ConceptEventListener.deleteShortCut,
                    preventDefault: true,
                    description: ''
                },
                activate_down: {
                    name: 'Activate Next Concept',
                    binding: ['down'],
                    callback: ConceptEventListener.activeShortcutDown,
                    preventDefault: true,
                    description: 'Activate the next Concept'
                },
                activate_up: {
                    name: 'Activate Previous Concept',
                    binding: ['up'],
                    callback: ConceptEventListener.activeShortcutUp,
                    preventDefault: true,
                    description: 'Activate Previous Concept'
                },
                move_concept_down: {
                    name: 'Move Concept Down',
                    binding: ['ctrl+down'],
                    callback: ConceptEventListener.moveShortcutDown,
                    preventDefault: true,
                    description: ''
                },
                move_concept_up: {
                    name: 'Move Concept Up',
                    binding: ['ctrl+up'],
                    callback: ConceptEventListener.moveShortcutUp,
                    preventDefault: true,
                    description: ''
                },
                move_concept_left: {
                    name: 'Move Concept Left',
                    binding: ['ctrl+left', 'shift+tab'],
                    callback: ConceptEventListener.moveShortcutLeft,
                    preventDefault: true,
                    description: ''
                },
                move_concept_right: {
                    name: 'Move Concept Right',
                    binding: ['ctrl+right', 'tab'],
                    callback: ConceptEventListener.moveShortcutRight,
                    preventDefault: true,
                    description: ''
                },
                toggle_pvs: {
                    name: 'Toggle Properties View',
                    binding: ['ctrl+alt+x'],
                    callback: PVS.toggleOpenState,
                    preventDefault: true,
                    description: ''
                }
            },
            search: {
                search: {
                    name: 'Search',
                    binding: ['enter'],
                    callback: ProjectSearch.triggerSearch,
                    preventDefault: true,
                    description: ''
                },
                clear_search: {
                    name: 'Clear Search',
                    binding: ['esc'],
                    callback: ProjectSearch.clearSearch,
                    preventDefault: true,
                    description: ''
                }
            },
            dvs_lightbox: {
                close: {
                    name: 'Close Lightbox',
                    binding: ['esc', 'enter'],
                    callback: DVS.closeImageLightbox,
                    preventDefault: true,
                    description: ''
                },
                activate_down: {
                    name: 'Activate Next Concept',
                    binding: ['down'],
                    callback: Shortcut.nop,
                    preventDefault: true,
                    description: ''
                },
                activate_up: {
                    name: 'Stop Scrolling',
                    binding: ['up'],
                    callback: Shortcut.nop,
                    preventDefault: true,
                    description: ''
                },
                activate_left: {
                    name: 'Stop Scrolling',
                    binding: ['left'],
                    callback: Shortcut.nop,
                    preventDefault: true,
                    description: ''
                },
                activate_right: {
                    name: 'Stop Scrolling',
                    binding: ['right'],
                    callback: Shortcut.nop,
                    preventDefault: true,
                    description: ''
                }
            },
            document_chat: {
                send_message: {
                    name: 'Send Message',
                    binding: ['enter'],
                    callback: Document.sendBtnClick,
                    preventDefault: true,
                    description: ''
                }
            },
            summernote: {
                cancel_summernote: {
                    name: 'Cancel Summernote',
                    binding: ['esc'],
                    callback: ConceptEventListener.cancelSummerNote,
                    preventDefault: true,
                    description: ''
                },
                finalize_summernote: {
                    name: 'Finalize Summernote',
                    binding: ['enter'],
                    callback: ConceptEventListener.finalizeCreateSummerNote,
                    preventDefault: true,
                    description: ''
                },
                move_concept_down: {
                    name: 'Move Concept Down',
                    binding: ['ctrl+down'],
                    callback: ConceptEventListener.moveShortcutDown,
                    preventDefault: true,
                    description: ''
                },
                move_concept_up: {
                    name: 'Move Concept Up',
                    binding: ['ctrl+up'],
                    callback: ConceptEventListener.moveShortcutUp,
                    preventDefault: true,
                    description: ''
                },
                move_concept_left: {
                    name: 'Move Concept Left',
                    binding: ['shift+tab'],
                    callback: ConceptEventListener.moveShortcutLeft,
                    preventDefault: true,
                    description: ''
                },
                move_concept_right: {
                    name: 'Move Concept Right',
                    binding: ['tab'],
                    callback: ConceptEventListener.moveShortcutRight,
                    preventDefault: true,
                    description: ''
                },
                toggle_ordered_list: {
                    name: 'Toggle Ordered List',
                    binding: ['ctrl+o'],
                    callback: AttributeEventListener.toggleOrderedListShortCut,
                    preventDefault: true,
                    description: ''
                },
                toggle_unordered_list: {
                    name: 'Toggle Unordered List',
                    binding: ['ctrl+u'],
                    callback: AttributeEventListener.toggleUnorderedListShortCut,
                    preventDefault: true,
                    description: ''
                },
                toggle_header: {
                    name: 'Toggle Header',
                    binding: ['ctrl+h'],
                    callback: AttributeEventListener.toggleHeaderShortCut,
                    preventDefault: true,
                    description: ''
                },
                unset_callback: ConceptEventListener.finalizeAndCancelCreateSummerNote
            },
            pres_new_phr_summernote: {
                cancel_summernote: {
                    name: 'Cancel Summernote',
                    binding: ['esc'],
                    callback: PhrasingEventListener.cancelCreatePresentationSummerNote,
                    preventDefault: true,
                    description: ''
                },
                finalize_summernote: {
                    name: 'Finalize Summernote',
                    binding: ['enter'],
                    callback: PhrasingEventListener.finalizeCreatePresentationSummernote,
                    preventDefault: true,
                    description: ''
                }
            },
            pres_edit_phr_summernote: {
                cancel_summernote: {
                    name: 'Cancel Summernote',
                    binding: ['esc'],
                    callback: PhrasingEventListener.cancelEditPresentationSummerNote,
                    preventDefault: true,
                    description: ''
                },
                finalize_summernote: {
                    name: 'Finalize Summernote',
                    binding: ['enter'],
                    callback: PhrasingEventListener.finalizeEditPresentationSummernote,
                    preventDefault: true,
                    description: ''
                }
            },
            edit_phrasing_summernote: {
                cancel_summernote: {
                    name: 'Cancel Summernote',
                    binding: ['esc'],
                    callback: PhrasingEventListener.cancelEditSummerNote,
                    preventDefault: true,
                    description: ''
                },
                finalize_summernote: {
                    name: 'Finalize Summernote',
                    binding: ['enter'],
                    callback: PhrasingEventListener.finalizeEditSummerNote,
                    preventDefault: true,
                    description: ''
                },
                move_concept_down: {
                    name: 'Move Concept Down',
                    binding: ['ctrl+down'],
                    callback: ConceptEventListener.moveShortcutDown,
                    preventDefault: true,
                    description: ''
                },
                move_concept_up: {
                    name: 'Move Concept Up',
                    binding: ['ctrl+up'],
                    callback: ConceptEventListener.moveShortcutUp,
                    preventDefault: true,
                    description: ''
                },
                move_concept_left: {
                    name: 'Move Concept Left',
                    binding: ['shift+tab'],
                    callback: ConceptEventListener.moveShortcutLeft,
                    preventDefault: true,
                    description: ''
                },
                move_concept_right: {
                    name: 'Move Concept Right',
                    binding: ['tab'],
                    callback: ConceptEventListener.moveShortcutRight,
                    preventDefault: true,
                    description: ''
                },
                toggle_ordered_list: {
                    name: 'Toggle Ordered List',
                    binding: ['ctrl+o'],
                    callback: AttributeEventListener.toggleOrderedListShortCut,
                    preventDefault: true,
                    description: ''
                },
                toggle_unordered_list: {
                    name: 'Toggle Unordered List',
                    binding: ['ctrl+u'],
                    callback: AttributeEventListener.toggleUnorderedListShortCut,
                    preventDefault: true,
                    description: ''
                },
                toggle_header: {
                    name: 'Toggle Header',
                    binding: ['ctrl+h'],
                    callback: AttributeEventListener.toggleHeaderShortCut,
                    preventDefault: true,
                    description: ''
                },
                unset_callback: PhrasingEventListener.finalizeAndCancelEditSummerNote
            },
            create_phrasing_summernote: {
                cancel_summernote: {
                    name: 'Cancel Summernote',
                    binding: ['esc'],
                    callback: PhrasingEventListener.cancelCreateSummerNote,
                    preventDefault: true,
                    description: ''
                },
                finalize_summernote: {
                    name: 'Finalize Summernote',
                    binding: ['enter'],
                    callback: PhrasingEventListener.finalizeCreateSummerNote,
                    preventDefault: true,
                    description: ''
                },
                move_concept_down: {
                    name: 'Move Concept Down',
                    binding: ['ctrl+down'],
                    callback: ConceptEventListener.moveShortcutDown,
                    preventDefault: true,
                    description: ''
                },
                move_concept_up: {
                    name: 'Move Concept Up',
                    binding: ['ctrl+up'],
                    callback: ConceptEventListener.moveShortcutUp,
                    preventDefault: true,
                    description: ''
                },
                move_concept_left: {
                    name: 'Move Concept Left',
                    binding: ['shift+tab'],
                    callback: ConceptEventListener.moveShortcutLeft,
                    preventDefault: true,
                    description: ''
                },
                move_concept_right: {
                    name: 'Move Concept Right',
                    binding: ['tab'],
                    callback: ConceptEventListener.moveShortcutRight,
                    preventDefault: true,
                    description: ''
                },
                toggle_ordered_list: {
                    name: 'Toggle Ordered List',
                    binding: ['ctrl+o'],
                    callback: AttributeEventListener.toggleOrderedListShortCut,
                    preventDefault: true,
                    description: ''
                },
                toggle_unordered_list: {
                    name: 'Toggle Unordered List',
                    binding: ['ctrl+u'],
                    callback: AttributeEventListener.toggleUnorderedListShortCut,
                    preventDefault: true,
                    description: ''
                },
                toggle_header: {
                    name: 'Toggle Header',
                    binding: ['ctrl+h'],
                    callback: AttributeEventListener.toggleHeaderShortCut,
                    preventDefault: true,
                    description: ''
                },
                unset_callback: PhrasingEventListener.finalizeAndCancelCreateSummerNote
            },
            create_image_modal: {
                cancel_create_image: {
                    name: 'Cancel Create Image',
                    binding: ['esc'],
                    callback: ConceptEventListener.cancelCreateImageModal,
                    preventDefault: true,
                    description: ''
                },
                create_image: {
                    name: 'Create Image',
                    binding: ['enter'],
                    callback: CreateImageModal.save,
                    preventDefault: true,
                    description: ''
                }
            },
            upload_image: {
                cancel_image_upload: {
                    name: 'Cancel Image Upload',
                    binding: ['esc'],
                    callback: ConceptEventListener.cancelCreateLinkModal,
                    preventDefault: true,
                    description: ''
                },
                upload_image: {
                    name: 'Upload Image',
                    binding: ['enter'],
                    callback: CreateImageModal.startUpload,
                    preventDefault: true,
                    description: ''
                }
            },
            create_link_concept: {
                cancel_create_link: {
                    name: 'Cancel Create link',
                    binding: ['esc'],
                    callback: ConceptEventListener.cancelCreateLinkModal,
                    preventDefault: true,
                    description: ''
                },
                create_link: {
                    name: 'Create Link',
                    binding: ['enter'],
                    callback: CreateLinkModal.save,
                    preventDefault: true,
                    description: ''
                }
            },
            document_properties_modal: {
                cancel_edit_properties: {
                    name: 'Cancel Edit Document Properties',
                    binding: ['esc'],
                    callback: DocumentPropertiesModal.hide,
                    preventDefault: true,
                    description: ''
                },
                save_edit_properties: {
                    name: 'Save Document Properties',
                    binding: ['enter'],
                    callback: DocumentPropertiesModal.save,
                    preventDefault: true,
                    description: ''
                }
            },
            project_properties_modal: {
                cancel_edit_properties: {
                    name: 'Cancel Edit Project Properties',
                    binding: ['esc'],
                    callback: ProjectPropertiesModal.hide,
                    preventDefault: true,
                    description: ''
                },
                save_edit_properties: {
                    name: 'Save Project Properties',
                    binding: ['enter'],
                    callback: ProjectPropertiesModal.save,
                    preventDefault: true,
                    description: ''
                }
            },
            permissions_modal: {
                close_permissions: {
                    name: 'Close Permissions',
                    binding: ['esc'],
                    callback: DocumentPropertiesModal.hide,
                    preventDefault: true,
                    description: ''
                },
                add_group: {
                    name: 'Add Group',
                    binding: ['enter'],
                    callback: PermissionSettingsModal.addGroupBtnTrigger,
                    preventDefault: true,
                    description: ''
                }
            },
            restore_project_modal: {
                close_restore_project: {
                    name: 'Close Permissions',
                    binding: ['esc'],
                    callback: ProjectRestoreModal.hide,
                    preventDefault: true,
                    description: ''
                },
                open_restore_project: {
                    name: 'Open Restored Project',
                    binding: ['enter'],
                    callback: ProjectRestoreModal.open,
                    preventDefault: true,
                    description: ''
                }
            },
            annotation: {
                clear_reply_input: {
                    name: 'Clear Comment Reply Input',
                    binding: ['esc'],
                    callback: Annotation.clearReplyInput,
                    preventDefault: true,
                    description: ''
                },
                save_reply_input: {
                    name: 'Save Comment Reply Input',
                    binding: ['enter'],
                    callback: Annotation.saveReplyInput,
                    preventDefault: true,
                    description: ''
                }
            },
            slideshow: {
                cancel: {
                    name: 'Cancel Presentation',
                    binding: ['esc'],
                    callback: Util.cancelSlideShow,
                    preventDefault: false,
                    description: ''
                },
                activate_down: {
                    name: 'Activate Next Concept',
                    binding: ['down'],
                    callback: ConceptEventListener.activeShortcutDown,
                    preventDefault: true,
                    description: 'Activate the next Concept'
                },
                activate_up: {
                    name: 'Activate Previous Concept',
                    binding: ['up'],
                    callback: ConceptEventListener.activeShortcutUp,
                    preventDefault: true,
                    description: 'Activate Previous Concept'
                }
            }
        },
        world_page: {
            dvs: {
                activate_down: {
                    name: 'Activate Next Concept',
                    binding: ['down'],
                    callback: ConceptEventListener.activeShortcutDown,
                    preventDefault: true,
                    description: 'Activate the next Concept'
                },
                activate_up: {
                    name: 'Activate Previous Concept',
                    binding: ['up'],
                    callback: ConceptEventListener.activeShortcutUp,
                    preventDefault: true,
                    description: 'Activate Previous Concept'
                },
                activate_left: {
                    name: 'Activate Parent Concept',
                    binding: ['left'],
                    callback: ConceptEventListener.activeShortcutLeft,
                    preventDefault: true,
                    description: 'Activate Parent Concept, or collapse current parent'
                },
                activate_right: {
                    name: 'Activate Child Concept',
                    binding: ['right'],
                    callback: ConceptEventListener.activeShortcutRight,
                    preventDefault: true,
                    description: 'Activate Child Concept, or expand current parent'
                }
            }
        },
        concept_page: {
            dvs: {
                activate_down: {
                    name: 'Activate Next Concept',
                    binding: ['down'],
                    callback: ConceptEventListener.activeShortcutDown,
                    preventDefault: true,
                    description: 'Activate the next Concept'
                },
                activate_up: {
                    name: 'Activate Previous Concept',
                    binding: ['up'],
                    callback: ConceptEventListener.activeShortcutUp,
                    preventDefault: true,
                    description: 'Activate Previous Concept'
                },
                activate_left: {
                    name: 'Activate Parent Concept',
                    binding: ['left'],
                    callback: ConceptEventListener.activeShortcutLeft,
                    preventDefault: true,
                    description: 'Activate Parent Concept, or collapse current parent'
                },
                activate_right: {
                    name: 'Activate Child Concept',
                    binding: ['right'],
                    callback: ConceptEventListener.activeShortcutRight,
                    preventDefault: true,
                    description: 'Activate Child Concept, or expand current parent'
                }
            }
        },
        home_page: {
            default: 'project_table',
            project_table: {
                create_project: {
                    name: 'Create Project',
                    binding: ['p c'],
                    callback: ProjectEventListener.createShortcut,
                    preventDefault: true,
                    description: ''
                },
                import_project: {
                    name: 'Import Project',
                    binding: ['p i'],
                    callback: ProjectEventListener.importShortcut,
                    preventDefault: true,
                    description: ''
                },
                delete_checked_projects: {
                    name: 'Delete Checked Projects',
                    binding: ['del', 'p d'],
                    callback: ProjectTable.deleteCheckedProjects,
                    preventDefault: true,
                    description: ''
                },
                change_project_security: {
                    name: 'Change Project Security',
                    binding: ['p s'],
                    callback: ProjectEventListener.setPermissionsHomePageShortcut,
                    preventDefault: true,
                    description: ''
                },
                search: {
                    name: 'Search',
                    binding: ['ctrl+f', '/'],
                    callback: LibrarySearch.focusSearch,
                    preventDefault: true,
                    description: ''
                },
                refresh_projects: {
                    name: 'Refresh Projects',
                    binding: ['r'],
                    callback: ProjectTable.loadUserProjects,
                    preventDefault: true,
                    description: ''
                },
                show_keybindings: {
                    name: 'Show Keybindings',
                    binding: ['ctrl+k'],
                    callback: Shortcut.nop,
                    preventDefault: true,
                    description: ''
                }
            },
            create_project_modal: {
                cancel: {
                    name: 'Cancel Create Project',
                    binding: ['ecs'],
                    callback: ProjectCreateModal.hide,
                    preventDefault: true,
                    description: ''
                },
                save: {
                    name: 'Save Project',
                    binding: ['enter'],
                    callback: ProjectCreateModal.create,
                    preventDefault: true,
                    description: ''
                }
            },
            restore_project_modal: {
                close_restore_project: {
                    name: 'Close Permissions',
                    binding: ['esc'],
                    callback: ProjectRestoreModal.hide,
                    preventDefault: true,
                    description: ''
                },
                open_restore_project: {
                    name: 'Open Restored Project',
                    binding: ['enter'],
                    callback: ProjectRestoreModal.open,
                    preventDefault: true,
                    description: ''
                }
            },
            import_project_modal: {
                cancel: {
                    name: 'Cancel Create Project',
                    binding: ['esc'],
                    callback: ProjectImportModal.hide,
                    preventDefault: true,
                    description: ''
                },
                import: {
                    name: 'Import Project',
                    binding: ['enter'],
                    callback: ProjectImportModal.create,
                    preventDefault: true,
                    description: ''
                }
            },
            imported_project_modal: {
                cancel: {
                    name: 'Close Imported Modal',
                    binding: ['esc'],
                    callback: ProjectImportModal.hide,
                    preventDefault: true,
                    description: ''
                },
                open: {
                    name: 'Open Imported Project',
                    binding: ['enter'],
                    callback: ProjectImportModal.open,
                    preventDefault: true,
                    description: ''
                }
            },
            search: {
                search: {
                    name: 'Search',
                    binding: ['enter'],
                    callback: LibrarySearch.triggerSearch,
                    preventDefault: true,
                    description: ''
                },
                clear_search: {
                    name: 'Clear Search',
                    binding: ['esc'],
                    callback: LibrarySearch.clearSearch,
                    preventDefault: true,
                    description: ''
                }
            }
        }
    };

    Mousetrap.stopCallback = function () {
        return false;
    };
};

Shortcut.current_bindings = null;
Shortcut.getPageMapping = function () {
    if (Page.isProjectPage())
        var mappings = Shortcut.shortcut_mapping.project_page;
    else if (Page.isWorldPage())
        mappings = Shortcut.shortcut_mapping.world_page;
    else if (Page.isConceptPage())
        mappings = Shortcut.shortcut_mapping.concept_page;
    else if (Page.isHomePage())
        mappings = Shortcut.shortcut_mapping.home_page;
    return mappings;
};

Shortcut.set = function (shortcuts) {
    Mousetrap.reset();
    var mappings = Shortcut.getPageMapping();
    if (mappings[shortcuts] == null)
        throw 'invalid shortcut mapping given';

    if (Shortcut.current_bindings && Shortcut.current_bindings.unset_callback)
        Shortcut.current_bindings.unset_callback();

    mappings = mappings[shortcuts];
    Shortcut.current_bindings = mappings;

    console.debug('Loading Shortcuts: %s', shortcuts);
    $.each(mappings, function (key, value) {
        if (value.binding) {
            Mousetrap.bind(value.binding, function (e, combo) {
                console.debug('Shortcut: %s Combo: %s', key, combo);
                value.callback();
                return !value.preventDefault;
            });
        }
    });
};

Shortcut.reset = function () {
    var mappings = Shortcut.getPageMapping();
    Shortcut.set(mappings.default);
};

Shortcut.paused = false;
Shortcut.pause = function () {
    if (!Shortcut.paused) {
        Mousetrap.reset();
        Shortcut.paused = true;
    }

};

Shortcut.unpause = function () {
    if (Shortcut.paused) {
        Shortcut.paused = false;
        $.each(Shortcut.current_bindings, function (key, value) {
            Mousetrap.bind(value.binding, function () {
                value.callback();
                return !value.preventDefault;
            });
        });
    }
};

Shortcut.nop = function () {};