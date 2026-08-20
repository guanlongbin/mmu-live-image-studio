<template>
    <span
        class="user-with-kim-container"
        @click.stop="chatWithUser"
    >
        <img :src="kimIcon" class="kim-png" />
        <span class="owners">
            {{ displayName }}
        </span>
    </span>
</template>

<script lang="ts" setup>
import { computed, PropType } from 'vue';
import { openSchemaUrl } from '@ks-data/utils';
import kimIcon from '../assets/kim.png';

// 定义 props
const props = defineProps({
    name: {
        type: String,
        default: '-',
    },
    id: {
        type: String,
        default: '',
    },
    type: {
        type: String,
        default: '',
    },
    kimType: {
        type: String as PropType<'user' | 'group'>,
        default: 'user',
    },
    showNameEnInParentheses: {
        type: Boolean,
        default: true,
    },
});
const emit = defineEmits(['click']);

// 点击 kim 图标的处理函数
const chatWithUser = () => {
    try {
        if (props.kimType === 'user') {
            const nameEn = props.name.includes('/') ? props.name.split('/')[1] : props.name;
            if (nameEn) {
                openSchemaUrl(`kim://username?username=${nameEn}`);
            }
        } else if (props.kimType === 'group') {
            openSchemaUrl(`kim://thread?id=${props.id}&type=${props.type}`);
        }
        emit('click', '点击kimWithUser');
    } catch (error) {
        console.error('chatWithUser error:', error);
        return;
    }
};

const nameZh = computed(() => (props.name.includes('/') ? props.name.split('/')[0] : props.name));

const displayName = computed(() => {
    if (!props.name || props.name === '-') return '-';
    if (!props.showNameEnInParentheses) return nameZh.value;

    const parts = props.name.split('/');
    if (parts.length >= 2) {
        return `${parts[0]}(${parts[1]})`;
    }
    return props.name;
});
</script>

<style scoped>
.user-with-kim-container {
    cursor: pointer;
    display: flex;
    margin: 0 4px;
}
.kim-png {
    height: 14px;
    position: relative;
    top: 3px;
}

.owners {
    font-size: 12px;
    font-weight: normal;
    margin-left: 2px;
}
</style>
