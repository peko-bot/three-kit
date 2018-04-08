define(['three'], function (THREE) {
    var MeshHelper = {
        objectFromMouse(pagex, pagey) { // 获得鼠标位置的板块模型对象
            var offset = MeshHelper.getOffset(this.renderer.domElement);
            var eltx = pagex - offset.left;
            var elty = pagey - offset.top;
            var container = this._container;

            var vpx = (eltx / container.offsetWidth) * 2 - 1;
            var vpy = -(elty / container.offsetHeight) * 2 + 1;
            var vector = new THREE.Vector2(vpx, vpy);
            var raycaster = new THREE.Raycaster();

            raycaster.setFromCamera(vector, this.camera);

            var intersects = raycaster.intersectObjects(this.root.children, true);

            var len = intersects.length;
            if (len > 0) {
                var intersect = intersects[0];
                if (intersect) {
                    return intersect;
                }
            }

            return { object: null, point: null, face: null };
        },
        getOffset(node, offset) { // 获得元素相对整个页面的偏移量
            if (!offset) {
                offset = {};
                offset.top = 0;
                offset.left = 0;
            }

            if (node == document.body) { // 当该节点为body节点时，结束递归
                return offset;
            }

            offset.top += node.offsetTop;
            offset.left += node.offsetLeft;

            return this.getOffset(node.parentNode, offset); // 向上累加offset里的值
        }
    }

    return MeshHelper;
});