import React from 'react';
import { useAppSelector } from '../../store/hooks';
import type { RootState } from '../../store/types';
import styles from './index.module.css';

export interface NavItem {
    id: string;
    label: string;
    url: string;
    /** 预设图标 key，仅用于内置站点（YouTube/GitHub 等） */
    icon?: 'youtube' | 'chatgpt' | 'github' | 'x';
    /** 站点图标地址（通过 Google Favicon API 自动生成） */
    iconUrl?: string;
}

const defaultItems: NavItem[] = [
    { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com', icon: 'youtube' },
    { id: 'chatgpt', label: 'ChatGPT', url: 'https://chat.openai.com', icon: 'chatgpt' },
    { id: 'github', label: 'GitHub', url: 'https://github.com', icon: 'github' },
    { id: 'x', label: 'X', url: 'https://x.com', icon: 'x' },
];

const IconYouTube: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
);

const IconChatGPT: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
);

const IconGitHub: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
);

const IconX: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

/** 默认占位图标（当自动获取失败或未配置时使用） */
const IconDefault: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.16" />
        <path
            d="M12 6a3.25 3.25 0 1 1 0 6.5A3.25 3.25 0 0 1 12 6Zm0 8c3.038 0 5.5 1.462 5.5 3.25 0 .414-.336.75-.75.75H7.25A.75.75 0 0 1 6.5 17.25C6.5 15.462 8.962 14 12 14Z"
            fill="currentColor"
        />
    </svg>
);

const iconMap = {
    youtube: IconYouTube,
    chatgpt: IconChatGPT,
    github: IconGitHub,
    x: IconX,
};

export interface BottomNavBarProps {
    items?: NavItem[];
    className?: string;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({
    items: propItems,
    className = '',
}) => {
    const isDirectLinkValue = useAppSelector((state: RootState) => state.config.isDirectLink);
    const isDirectLink = typeof isDirectLinkValue === 'boolean'
        ? isDirectLinkValue
        : isDirectLinkValue === 'true' || isDirectLinkValue === true;

    // 优先使用 props，其次使用 store 中的配置，最后使用默认值
    const storeNavItems = useAppSelector((state: RootState) => state.config.navItems);
    const items = propItems || storeNavItems || defaultItems;

    return (
        <nav
            className={`${styles.nav} ${className}`}
            role="navigation"
            aria-label="底部导航"
        >
            <ul className={styles.list}>
                {items.map((item) => {
                    const IconComponent = item.icon ? iconMap[item.icon] : undefined;
                    const faviconUrl = item.iconUrl;
                    const hasBuiltInIcon = !!IconComponent;

                    return (
                        <li key={item.id} className={styles.item}>
                            <a
                                href={item.url}
                                {...(isDirectLink ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                                className={styles.link}
                                aria-label={item.label}
                            >
                                <span className={styles.iconWrap}>
                                    {hasBuiltInIcon ? (
                                        // 旧的内置图标保持不变
                                        <IconComponent className={styles.icon} />
                                    ) : (
                                        <>
                                            {/* 自定义站点：默认占位 + 自动 favicon */}
                                            <IconDefault className={styles.icon} />
                                            {faviconUrl && (
                                                <img
                                                    src={faviconUrl}
                                                    alt=""
                                                    className={styles.iconImage}
                                                    onError={(e) => {
                                                        // 加载失败时隐藏图片，露出默认 SVG
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </span>
                            </a>
                            <span className={styles.label}>{item.label}</span>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default BottomNavBar;
