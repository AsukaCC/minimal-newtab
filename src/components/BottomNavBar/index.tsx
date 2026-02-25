import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import type { RootState } from '../../store/types';
import styles from './index.module.css';
import { YouTube, ChatGPT, GitHub, X, defaultWebsiteIcon as DefaultWebsiteIcon, Claude } from '../../common/svgIcon';
import { defaultNavItems } from '../../common/defaultWebsites';
import type { NavItem } from '../../types';

const iconByKey: Record<'youtube' | 'chatgpt' | 'github' | 'x' | 'claude', React.FC<{ className?: string }>> = {
    youtube: YouTube,
    chatgpt: ChatGPT,
    github: GitHub,
    x: X,
    claude: Claude,
};

export type { NavItem };

export interface BottomNavBarProps {
    items?: NavItem[];
    className?: string;
}

const TRACK_CYCLES = 9;
const VIRTUAL_BUFFER = 4;

const isValidUrl = (url: string): boolean => {
    if (!url) return false;
    try {
        // 使用浏览器 URL 解析进行格式校验（需包含协议与主机）
        // 无效格式（例如纯文本、缺少主机等）会抛出异常
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const BottomNavBar: React.FC<BottomNavBarProps> = ({
    items: propItems,
    className = '',
}) => {
    const isDirectLinkValue = useAppSelector((state: RootState) => state.config.isDirectLink);
    const isDirectLink = typeof isDirectLinkValue === 'boolean'
        ? isDirectLinkValue
        : isDirectLinkValue === 'true' || isDirectLinkValue === true;

    // 先取出所有需要的 store 值，保证 hooks 次序稳定
    const showNavBarValue = useAppSelector((state: RootState) => state.config.showNavBar);
    const storeNavItems = useAppSelector((state: RootState) => state.config.navItems);
    const navBarThemeColor = useAppSelector((state: RootState) => state.config.navBarThemeColor);
    const navBarItemGap = useAppSelector((state: RootState) => state.config.navBarItemGap);
    const navBarIconSize = useAppSelector((state: RootState) => state.config.navBarIconSize);
    const items = propItems || storeNavItems || defaultNavItems;

    const showNavBar = typeof showNavBarValue === 'boolean' ? showNavBarValue : true;
    const scrollRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
    const latestScrollLeftRef = useRef(0);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const dragRef = useRef({
        isDragging: false,
        pointerId: -1,
        startX: 0,
        startScrollLeft: 0,
        hasDragged: false,
    });
    const lastPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
    const isPointerOverRef = useRef(false);
    const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

    const itemCount = items.length;
    // 直接使用 store 中的配置值计算，不再从 CSS 读取
    const configuredItemWidth = (navBarIconSize ?? 32) * 1.818;
    const configuredItemGap = navBarItemGap ?? 2;
    const itemWidth = configuredItemWidth;
    const itemGap = configuredItemGap;
    const itemStride = itemWidth + itemGap;
    const cycleWidth = itemCount * itemStride;
    const trackSlots = Math.max(itemCount * TRACK_CYCLES, itemCount);
    const centerCycleIndex = Math.floor(TRACK_CYCLES / 2);
    const centerBaseScroll = centerCycleIndex * cycleWidth;

    const updateMetrics = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const clientWidth = el.clientWidth;
        setViewportWidth(clientWidth);
        setHasOverflow(cycleWidth > clientWidth + 1);
    }, [cycleWidth]);

    const computeSlotUnderPointer = useCallback((clientX: number, clientY: number, scrollLeftVal: number) => {
        const el = scrollRef.current;
        if (!el || itemStride <= 0) return null;
        const rect = el.getBoundingClientRect();
        if (clientX < rect.left || clientX >= rect.right || clientY < rect.top || clientY >= rect.bottom) return null;
        const contentX = scrollLeftVal + (clientX - rect.left);
        const slot = Math.floor(contentX / itemStride);
        const maxSlot = hasOverflow ? trackSlots - 1 : itemCount - 1;
        if (slot < 0 || slot > maxSlot) return null;
        return slot;
    }, [hasOverflow, itemCount, itemStride, trackSlots]);

    const updateHoveredFromPointer = useCallback((clientX: number, clientY: number) => {
        const el = scrollRef.current;
        if (!el) return;
        const scrollLeftVal = el.scrollLeft;
        const slot = computeSlotUnderPointer(clientX, clientY, scrollLeftVal);
        setHoveredSlot(slot);
    }, [computeSlotUnderPointer]);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el || itemCount === 0) return;
        let nextScrollLeft = el.scrollLeft;

        if (hasOverflow && cycleWidth > 0) {
            const normalized = ((nextScrollLeft % cycleWidth) + cycleWidth) % cycleWidth;
            const wrappedScrollLeft = centerBaseScroll + normalized;
            const minSafeScroll = cycleWidth;
            const maxSafeScroll = cycleWidth * (TRACK_CYCLES - 1);
            if (nextScrollLeft <= minSafeScroll || nextScrollLeft >= maxSafeScroll) {
                el.scrollLeft = wrappedScrollLeft;
                nextScrollLeft = wrappedScrollLeft;
            }
        }

        latestScrollLeftRef.current = nextScrollLeft;
        if (rafRef.current === null) {
            rafRef.current = window.requestAnimationFrame(() => {
                setScrollLeft(latestScrollLeftRef.current);
                if (isPointerOverRef.current && lastPointerRef.current) {
                    updateHoveredFromPointer(lastPointerRef.current.clientX, lastPointerRef.current.clientY);
                }
                rafRef.current = null;
            });
        }
    }, [centerBaseScroll, cycleWidth, hasOverflow, itemCount, updateHoveredFromPointer]);

    const onWheel = useCallback((e: WheelEvent) => {
        const el = scrollRef.current;
        if (!el) return;
        if (!hasOverflow) return;
        e.preventDefault();

        const rawDelta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        // 限制单次滚轮滚动的距离，避免虚拟列表“跳太多格”
        const maxStep = itemStride * 1; // 最多约 1 个 item 的宽度
        const limitedDelta = Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), maxStep);

        el.scrollLeft += Number.isFinite(limitedDelta) ? limitedDelta : 0;
    }, [hasOverflow, itemStride]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [onWheel]);

    useEffect(() => {
        if (itemCount === 0) return;
        updateMetrics();
    }, [itemCount, updateMetrics, configuredItemWidth, configuredItemGap]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !('ResizeObserver' in window)) return;
        const observer = new ResizeObserver(() => {
            updateMetrics();
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [updateMetrics]);

    useEffect(() => {
        if (!hasOverflow || cycleWidth <= 0) return;
        const el = scrollRef.current;
        if (!el) return;
        el.scrollLeft = centerBaseScroll;
        latestScrollLeftRef.current = centerBaseScroll;
        setScrollLeft(centerBaseScroll);
    }, [centerBaseScroll, cycleWidth, hasOverflow, itemCount]);

    useEffect(() => () => {
        if (rafRef.current !== null) {
            window.cancelAnimationFrame(rafRef.current);
        }
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const el = scrollRef.current;
        if (!el) return;
        dragRef.current = {
            isDragging: false,
            pointerId: e.pointerId,
            startX: e.clientX,
            startScrollLeft: el.scrollLeft,
            hasDragged: false,
        };
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        lastPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
        isPointerOverRef.current = true;

        if (dragRef.current.pointerId === e.pointerId) {
            const el = scrollRef.current;
            if (!el) return;
            const dx = e.clientX - dragRef.current.startX;
            if (Math.abs(dx) > 5) {
                if (!dragRef.current.isDragging) {
                    // 超过阈值才真正开始拖拽，此时才捕获指针
                    dragRef.current.isDragging = true;
                    dragRef.current.hasDragged = true;
                    setHoveredSlot(null);
                    el.setPointerCapture(e.pointerId);
                }
                el.scrollLeft = dragRef.current.startScrollLeft - dx;
                return;
            }
        }

        updateHoveredFromPointer(e.clientX, e.clientY);
    }, [updateHoveredFromPointer]);

    const onPointerLeave = useCallback(() => {
        isPointerOverRef.current = false;
        lastPointerRef.current = null;
        setHoveredSlot(null);
    }, []);

    const onPointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const el = scrollRef.current;
        if (el && dragRef.current.pointerId === e.pointerId && el.hasPointerCapture(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
        }
        dragRef.current.isDragging = false;
        dragRef.current.pointerId = -1;
    }, []);

    const onItemClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        if (dragRef.current.hasDragged) {
            e.preventDefault();
            dragRef.current.hasDragged = false;
        }
    }, []);

    // 必须在任何条件 return 之前调用，保证 hooks 顺序稳定
    const {
        visibleSlots,
        listWidth,
        windowOffset,
        windowWidth,
    } = useMemo(() => {
        const slotsToRender = hasOverflow
            ? Math.ceil(viewportWidth / itemStride) + VIRTUAL_BUFFER * 2
            : itemCount;
        const firstVisibleSlot = hasOverflow ? Math.floor(scrollLeft / itemStride) : 0;
        const startSlot = hasOverflow ? Math.max(0, firstVisibleSlot - VIRTUAL_BUFFER) : 0;
        const endSlot = Math.min(trackSlots - 1, startSlot + slotsToRender - 1);
        const slots: number[] = [];
        for (let slot = startSlot; slot <= endSlot; slot += 1) {
            slots.push(slot);
        }
        return {
            visibleSlots: slots,
            listWidth: (hasOverflow ? trackSlots : itemCount) * itemStride,
            windowOffset: startSlot * itemStride,
            windowWidth: slots.length * itemStride,
        };
    }, [hasOverflow, itemCount, itemStride, scrollLeft, trackSlots, viewportWidth]);

    if (!showNavBar) {
        return null;
    }
    if (itemCount === 0) {
        return null;
    }

    return (
        <nav
            className={`${styles.nav} ${className}`}
            role="navigation"
            aria-label="底部导航"
            style={{
                '--nav-bar-theme-color': navBarThemeColor || 'var(--color-primary, #667eea)',
                '--item-width': `${configuredItemWidth}px`,
                '--item-gap': `${configuredItemGap}px`,
            } as React.CSSProperties}
        >
            <div className={styles.fadeViewport} data-fade={hasOverflow}>
                <div
                    ref={scrollRef}
                    className={`${styles.scrollContainer} ${hasOverflow ? styles.withFade : ''} ${hasOverflow ? styles.virtualHover : ''}`}
                    onScroll={handleScroll}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerLeave={onPointerLeave}
                    onPointerUp={onPointerEnd}
                    onPointerCancel={onPointerEnd}
                >
                    <div className={styles.list} role="list" style={{ width: `${listWidth}px` }}>
                        <div
                            className={styles.virtualWindow}
                            style={{ marginLeft: `${windowOffset}px`, width: `${windowWidth}px` }}
                        >
                            {visibleSlots.map((slot) => {
                                const item = items[slot % itemCount];
                                const IconComponent = item.icon ? iconByKey[item.icon] : undefined;
                                const faviconUrl = item.iconUrl;
                                const hasBuiltInIcon = !!IconComponent;
                                const validLink = isValidUrl(item.url);

                                const iconNode = (
                                    <span className={styles.iconWrap}>
                                        {hasBuiltInIcon ? (
                                            // 旧的内置图标保持不变
                                            <IconComponent className={styles.icon} />
                                        ) : (
                                            <>
                                                {/* 自定义站点：默认占位 + 自动 favicon */}
                                                {faviconUrl
                                                    ? (
                                                        <img
                                                            src={faviconUrl}
                                                            alt=""
                                                            className={styles.icon}
                                                            onError={(e) => {
                                                                // 加载失败时隐藏图片，露出默认 SVG
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (<DefaultWebsiteIcon className={styles.icon} />)

                                                }
                                            </>
                                        )}
                                    </span>
                                );

                                return (
                                    <div
                                        key={`${item.id}-${slot}`}
                                        className={`${styles.item} ${hoveredSlot === slot ? styles.itemHovered : ''}`}
                                        role="listitem"
                                    >
                                        {validLink ? (
                                            <a
                                                href={item.url}
                                                {...(isDirectLink ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                                                className={styles.link}
                                                aria-label={item.label}
                                                onClick={onItemClick}
                                            >
                                                {iconNode}
                                            </a>
                                        ) : (
                                            <div
                                                className={styles.link}
                                                aria-label={item.label}
                                            >
                                                {iconNode}
                                            </div>
                                        )}
                                        <span className={styles.label}>{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default BottomNavBar;
