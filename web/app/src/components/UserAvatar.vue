<!-- 组件样例：用户头像 + 名字。通过 props 接收用户对象，无副作用、可复用 -->
<template>
    <div class="user">
        <img class="avatar" :src="user.avatar" :alt="user.displayName || user.userName" referrerpolicy="no-referrer" />
        <span class="user-name">{{ user.displayName || user.userName }}</span>
    </div>
</template>

<script setup lang="ts">
interface User {
    avatar?: string;
    displayName?: string;
    userName?: string;
}
defineProps<{ user: User }>();
</script>

<style scoped>
.user {
    display: flex;
    align-items: center;
    gap: 8px;
}
.avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    background: #e5e6eb;
    border: 1px solid #e5e6eb;
}
.user-name {
    font-size: 14px;
    color: #1f2329;
}
</style>
