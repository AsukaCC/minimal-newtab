import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import {
  defaultNavItems,
  findBuiltInWebsiteByUrl,
  type BuiltInWebsite,
} from '../../../../common/defaultWebsites';
import { siteIconByKey } from '../../../../common/siteIconCatalog';
import { defaultWebsiteIcon as DefaultWebsiteIcon, DragMoveIcon } from '../../../../common/svgIcon';
import { useI18n } from '../../../../hooks/useI18n';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';
import { setNavItems } from '../../../../store';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import type { NavItem } from '../../../../types';
import {
  readCustomSvgFile,
  svgSourceToDataUrl,
  SvgIconValidationError,
} from '../../../../utils/customSvgIcon';
import SiteLibrary from './SiteLibrary';
import styles from './index.module.css';

interface WebsiteManagementModalProps {
  onClose: () => void;
}

const DragHandle: React.FC<{ 'aria-label'?: string }> = (props) => (
  <span
    className={styles.dragHandle}
    draggable
    role="button"
    tabIndex={-1}
    aria-label={props['aria-label']}
  >
    <DragMoveIcon className={styles.dragIcon} />
  </span>
);

const WebsiteManagementModal: React.FC<WebsiteManagementModalProps> = ({ onClose }) => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const storedNavItems = useAppSelector((state) => state.config.navItems);
  const [items, setItems] = useState<NavItem[]>(() => storedNavItems || defaultNavItems);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const siteListRef = useRef<HTMLDivElement>(null);
  const draggedElementRef = useRef<HTMLElement | null>(null);
  const dragGhostRef = useRef<HTMLElement | null>(null);
  const reorderAnimationTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const updateItems = useCallback(
    (updater: (current: NavItem[]) => NavItem[]) => {
      setItems((current) => {
        const next = updater(current);
        if (next !== current) dispatch(setNavItems(next));
        return next;
      });
    },
    [dispatch],
  );

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const overlay = overlayRef.current;
    const modal = modalRef.current;
    if (reducedMotion || !overlay || !modal) {
      onClose();
      return;
    }
    gsap.timeline({ onComplete: onClose })
      .to(modal, {
        autoAlpha: 0,
        scale: 0.98,
        y: 12,
        duration: 0.18,
        ease: 'power2.in',
      }, 0)
      .to(overlay, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0);
  }, [onClose, reducedMotion]);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const modal = modalRef.current;
    if (!overlay || !modal) return;
    const context = gsap.context(() => {
      gsap.fromTo(overlay, { autoAlpha: 0 }, {
        autoAlpha: 1,
        duration: reducedMotion ? 0 : 0.2,
        ease: 'power1.out',
      });
      gsap.fromTo(modal, { autoAlpha: 0, scale: 0.98, y: reducedMotion ? 0 : 16 }, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: reducedMotion ? 0 : 0.3,
        ease: 'power3.out',
        force3D: true,
      });
    }, overlay);
    return () => context.revert();
  }, [reducedMotion]);

  useEffect(() => {
    labelInputRef.current?.focus();
  }, [editingLabelId]);

  useEffect(() => {
    urlInputRef.current?.focus();
  }, [editingUrlId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape, true);
      previouslyFocused?.focus();
      dragGhostRef.current?.remove();
      if (reorderAnimationTimerRef.current !== null) {
        window.clearTimeout(reorderAnimationTimerRef.current);
      }
      gsap.killTweensOf([overlayRef.current, modalRef.current]);
    };
  }, [requestClose]);

  const handleDelete = useCallback((id: string) => {
    updateItems((current) => current.filter((item) => item.id !== id));
    setEditingLabelId((current) => (current === id ? null : current));
    setEditingUrlId((current) => (current === id ? null : current));
  }, [updateItems]);

  const updateItem = useCallback((id: string, patch: Partial<NavItem>) => {
    updateItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, [updateItems]);

  const handleLabelBlur = useCallback((id: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) updateItem(id, { label: trimmed });
    setEditingLabelId(null);
  }, [updateItem]);

  const handleUrlBlur = useCallback((id: string, value: string) => {
    const finalUrl = value.trim() || 'https://';
    const builtInIcon = findBuiltInWebsiteByUrl(finalUrl)?.icon;
    updateItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (finalUrl === 'https://') return { ...item, url: finalUrl };
        if (item.customIconSvg) return { ...item, url: finalUrl };
        return builtInIcon
          ? { ...item, url: finalUrl, icon: builtInIcon, iconUrl: undefined }
          : {
              ...item,
              url: finalUrl,
              icon: undefined,
              iconUrl: `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(finalUrl)}&sz=64`,
            };
      }),
    );
    setEditingUrlId(null);
  }, [updateItems]);

  const handleCustomIconUpload = useCallback(async (
    id: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIconError(null);
    try {
      const customIconSvg = await readCustomSvgFile(file);
      updateItem(id, {
        customIconSvg,
        icon: undefined,
        iconUrl: undefined,
      });
    } catch (error) {
      const code = error instanceof SvgIconValidationError
        ? error.code
        : 'invalid-svg';
      const messageKey = code === 'svg-too-large'
        ? 'settings_svgIconTooLarge'
        : code === 'invalid-file-type'
          ? 'settings_svgIconFileType'
          : 'settings_invalidSvgIcon';
      setIconError(t(messageKey));
    }
  }, [t, updateItem]);

  const handleRemoveCustomIcon = useCallback((item: NavItem) => {
    const builtInIcon = findBuiltInWebsiteByUrl(item.url)?.icon;
    updateItem(item.id, {
      customIconSvg: undefined,
      icon: builtInIcon,
      iconUrl: builtInIcon || item.url === 'https://'
        ? undefined
        : `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(item.url)}&sz=64`,
    });
    setIconError(null);
  }, [updateItem]);

  const handleAddBuiltInWebsite = useCallback((website: BuiltInWebsite) => {
    updateItems((current) => {
      if (current.some((item) => findBuiltInWebsiteByUrl(item.url)?.id === website.id)) {
        return current;
      }
      const id = current.some((item) => item.id === website.id)
        ? `${website.id}-${Date.now()}`
        : website.id;
      return [...current, { id, label: website.label, url: website.url, icon: website.icon }];
    });
  }, [updateItems]);

  const captureItemPositions = useCallback(() => {
    const positions = new Map<string, DOMRect>();
    siteListRef.current
      ?.querySelectorAll<HTMLElement>('[data-site-id]')
      .forEach((element) => {
        const id = element.dataset.siteId;
        if (id) positions.set(id, element.getBoundingClientRect());
      });
    return positions;
  }, []);

  const animateReorderedItems = useCallback((positions: Map<string, DOMRect>) => {
    if (reducedMotion) return;
    const list = siteListRef.current;
    if (list) {
      list.dataset.reorderAnimating = 'true';
      if (reorderAnimationTimerRef.current !== null) {
        window.clearTimeout(reorderAnimationTimerRef.current);
      }
      reorderAnimationTimerRef.current = window.setTimeout(() => {
        delete list.dataset.reorderAnimating;
        reorderAnimationTimerRef.current = null;
      }, 360);
    }
    requestAnimationFrame(() => {
      siteListRef.current
        ?.querySelectorAll<HTMLElement>('[data-site-id]')
        .forEach((element) => {
          const previous = positions.get(element.dataset.siteId || '');
          if (!previous) return;
          const current = element.getBoundingClientRect();
          const x = previous.left - current.left;
          const y = previous.top - current.top;
          if (Math.abs(x) < 1 && Math.abs(y) < 1) return;
          gsap.fromTo(element, { x, y }, {
            x: 0,
            y: 0,
            duration: 0.28,
            ease: 'power2.out',
            overwrite: true,
            force3D: true,
            clearProps: 'transform',
          });
        });
    });
  }, [reducedMotion]);

  const handleDrop = useCallback((event: React.DragEvent, toIndex: number) => {
    event.preventDefault();
    const fromIndex = Number.parseInt(event.dataTransfer.getData('text/plain'), 10);
    draggedElementRef.current?.classList.remove(styles.itemDragging);
    draggedElementRef.current = null;
    dragGhostRef.current?.remove();
    dragGhostRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
    if (Number.isNaN(fromIndex) || fromIndex === toIndex) return;
    const positions = captureItemPositions();
    updateItems((current) => {
      const next = [...current];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
    animateReorderedItems(positions);
  }, [animateReorderedItems, captureItemPositions, updateItems]);

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.websiteModalOverlay}
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={modalRef}
        className={styles.websiteModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="website-management-title"
        tabIndex={-1}
      >
        <header className={styles.websiteModalHeader}>
          <div>
            <h2 id="website-management-title" className={styles.websiteModalTitle}>
              {t('settings_websiteManagement')}
            </h2>
            <p className={styles.websiteModalSubtitle}>
              {t('settings_manageSitesDesc')} · {items.length}
            </p>
          </div>
          <button
            type="button"
            className={styles.websiteModalClose}
            onClick={requestClose}
            aria-label={t('settings_closeSettings')}
            title={t('settings_closeSettings')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className={styles.websiteModalBody}>
          <section className={styles.websiteLibraryPane}>
            <SiteLibrary items={items} onAdd={handleAddBuiltInWebsite} />
          </section>

          <section className={styles.currentSitesPane}>
            <div className={styles.currentSitesHeader}>
              <div>
                <h3 className={styles.currentSitesTitle}>{t('settings_currentWebsites')}</h3>
                <span className={styles.currentSitesCount}>{items.length}</span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={() => {
                    if (confirm(t('settings_navBarResetListConfirm'))) {
                      updateItems(() => defaultNavItems.map((item) => ({ ...item })));
                      setEditingLabelId(null);
                      setEditingUrlId(null);
                    }
                  }}
                >
                  {t('settings_reset')}
                </button>
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => {
                    const id = `item-${Date.now()}`;
                    updateItems((current) => [
                      ...current,
                      { id, label: 'Untitled', url: 'https://' },
                    ]);
                    setEditingLabelId(id);
                  }}
                >
                  + {t('settings_add')}
                </button>
              </div>
            </div>

            {iconError && <div className={styles.svgIconError}>{iconError}</div>}

            <div ref={siteListRef} className={styles.modalSiteList}>
              {items.length === 0 ? (
                <div className={styles.empty}>{t('settings_navBarEmpty')}</div>
              ) : (
                items.map((item, index) => {
                  const Icon = item.icon ? siteIconByKey[item.icon] : undefined;
                  const customIconUrl = item.customIconSvg
                    ? svgSourceToDataUrl(item.customIconSvg)
                    : undefined;
                  return (
                    <div
                      key={item.id}
                      className={`${styles.item} ${
                        draggingIndex === index ? styles.itemDragging : ''
                      } ${dragOverIndex === index ? styles.itemDragOver : ''}`}
                      data-drag-index={index}
                      data-site-id={item.id}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', index.toString());
                        event.dataTransfer.effectAllowed = 'move';
                        draggedElementRef.current = event.currentTarget;
                        event.currentTarget.classList.add(styles.itemDragging);
                        const ghost = event.currentTarget.cloneNode(true) as HTMLElement;
                        ghost.classList.add(styles.dragGhost);
                        ghost.style.width = `${event.currentTarget.offsetWidth}px`;
                        document.body.appendChild(ghost);
                        dragGhostRef.current = ghost;
                        event.dataTransfer.setDragImage(ghost, 28, 28);
                        setDraggingIndex(index);
                        setDragOverIndex(index);
                      }}
                      onDragEnter={() => setDragOverIndex(index)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(event) => handleDrop(event, index)}
                      onDragEnd={() => {
                        draggedElementRef.current?.classList.remove(styles.itemDragging);
                        draggedElementRef.current = null;
                        dragGhostRef.current?.remove();
                        dragGhostRef.current = null;
                        setDraggingIndex(null);
                        setDragOverIndex(null);
                      }}
                    >
                      <DragHandle aria-label={t('settings_dragToSort')} />
                      <span className={styles.currentSiteIcon} aria-hidden="true">
                        {customIconUrl ? (
                          <img src={customIconUrl} alt="" />
                        ) : Icon ? (
                          <Icon />
                        ) : item.iconUrl ? (
                          <img src={item.iconUrl} alt="" />
                        ) : (
                          <DefaultWebsiteIcon />
                        )}
                      </span>
                      <div className={styles.itemBody}>
                        <div className={styles.itemInfo}>
                          {editingLabelId === item.id ? (
                            <input
                              ref={labelInputRef}
                              className={`${styles.inlineInput} ${styles.inlineInputLabel}`}
                              defaultValue={item.label}
                              onBlur={(event) => handleLabelBlur(item.id, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') event.currentTarget.blur();
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className={styles.editableTextButton}
                              onClick={() => setEditingLabelId(item.id)}
                            >
                              <span className={styles.itemLabel}>{item.label}</span>
                            </button>
                          )}
                          {editingUrlId === item.id ? (
                            <input
                              ref={urlInputRef}
                              type="url"
                              className={`${styles.inlineInput} ${styles.inlineInputUrl}`}
                              defaultValue={item.url}
                              onBlur={(event) => handleUrlBlur(item.id, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') event.currentTarget.blur();
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className={styles.editableTextButton}
                              onClick={() => setEditingUrlId(item.id)}
                            >
                              <span className={styles.itemUrl}>{item.url}</span>
                            </button>
                          )}
                        </div>
                        <div className={styles.itemRight}>
                          <label
                            className={styles.svgUploadButton}
                            title={t('settings_uploadSvgIcon')}
                            aria-label={t('settings_uploadSvgIcon')}
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.currentTarget.querySelector('input')?.click();
                              }
                            }}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" />
                            </svg>
                            <input
                              className={styles.svgFileInput}
                              type="file"
                              accept=".svg,image/svg+xml"
                              onChange={(event) => void handleCustomIconUpload(item.id, event)}
                            />
                          </label>
                          {item.customIconSvg && (
                            <button
                              type="button"
                              className={styles.svgRemoveButton}
                              onClick={() => handleRemoveCustomIcon(item)}
                              aria-label={t('settings_removeCustomIcon')}
                              title={t('settings_removeCustomIcon')}
                            >
                              ×
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => handleDelete(item.id)}
                            aria-label={`${t('settings_delete')} ${item.label}`}
                          >
                            {t('settings_delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default WebsiteManagementModal;
