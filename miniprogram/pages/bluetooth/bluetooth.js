// miniprogram/pages/bluetooth/bluetooth.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    delayTimer:Number,
    isFound:false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },
    /**
    * 将ArrayBuffer转换成字符串
    */
   ab2hex:function(buffer) {
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function(bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  },
  /**
  * 将字符串转换成ArrayBufer
  */
 string2buffer(str) {
     if (!str) return;
     var val = "";
     for (var i = 0; i < str.length; i++) {
       val += str.charCodeAt(i).toString(16);
     }
     console.log(val);
     str = val;
     val = "";
     let length = str.length;
     let index = 0;
     let array = []
     while (index < length) {
       array.push(str.substring(index, index + 2));
       index = index + 2;
     }
     val = array.join(",");
     // 将16进制转化为ArrayBuffer
     return new Uint8Array(val.match(/[\da-f]{2}/gi).map(function (h) {
       return parseInt(h, 16)
     })).buffer
   },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 开启蓝牙第一步
    const that = this;
    wx.openBluetoothAdapter({
      success (res) {
        console.log("openBluetoothAdapter:"  + JSON.stringify(res))
        console.log("打开蓝牙成功.")

        // wx.getBluetoothAdapterState({
        //   success (res) {
        //     console.log("getBluetoothAdapterState:" + + JSON.stringify(res))
        //   }
        // })
        
        wx.startBluetoothDevicesDiscovery({
          success (res) {
            wx.showLoading({
               title: '正在搜索设备',
            })
            that.delayTimer = setInterval(function(){
                        that.discoveryBLE() //3.0 //这里的discovery需要多次调用
                   }, 1000);
                   setTimeout(function () {
                     if (that.isFound) {
                       return;
                     } else {
                       wx.hideLoading();
                       console.log("搜索设备超时");
                       wx.stopBluetoothDevicesDiscovery({
                         success: function (res) {
                           console.log('连接蓝牙成功之后关闭蓝牙搜索');
                         }
                       })
                       clearInterval(that.delayTimer)
                       wx.showModal({
                         title: '搜索设备超时',
                         content: '请检查蓝牙设备是否正常工作，Android手机请打开GPS定位',
                         showCancel: false
                       })
                       console.log("搜索设备超时，请打开GPS定位，再搜索")
                       return
                     }
                   }, 15000);
          },
          fail: function(res) {
            console.log("蓝牙设备服务发现失败: " + res.errMsg);
         }
            
        })
        
      }
    })
    
    // ArrayBuffer转16进度字符串示例

  // wx.getBluetoothDevices({
  //   success: function (res) {
  //     console.log(res)
  //     if (res.devices[0]) {
  //       console.log(ab2hex(res.devices[0].advertisData))
  //     }
  //   }})

    // wx.getBeacons({
    //   complete: (res) => {
    //     console.log("Beacons扫描结果：" + JSON.stringify(res));
    //   },
    // })
    // wx.startBeaconDiscovery({
    //   success(res) { 
    //     console.log("扫描结果：" + res);
    //   }
    // })
  },
  discoveryBLE:function(){
    var that = this
     wx.getBluetoothDevices({
       success: function(res) {
         var list = res.devices;
         console.log('总共有' + list.length + "个设备需要设置")
         console.log("搜索到的蓝牙设备:" + list.length + "个");
         list.forEach(element => {
           console.log("name:" + element.name + "\n");
           console.log("deviceId:" + element.deviceId + "\n");
           console.log("RSSI:" + element.rssi + "\n");
           if (element.name === "小淘卡管家"){//“Jason'sMacBook Pro”
            that.connectDevices(element);
             return false;
           }
           
         });
         if(list.length <= 0){
           return ;
        }
      },
      fail: function() {
         console.log('搜索蓝牙设备失败');
      }
    })
  },

  connectDevices:function(device){

    var that = this;
       wx.hideLoading();
       that.isFound = true;
       clearInterval(this. delayTimer); 
       wx.stopBluetoothDevicesDiscovery({
         success: function (res) {
           console.log('连接蓝牙成功之后关闭蓝牙搜索');
         }
       })
      //  链接第一个
       this.createBLE(device.deviceId);
  },

  createBLE: function(deviceId){
    console.log("连接: [" + deviceId+"]");
    var that = this;
    this.closeBLE(deviceId, function(res){
      console.log("预先关闭，再打开");
      setTimeout(function(){
        wx.createBLEConnection({
          deviceId: deviceId,
          success: function (res) {
            console.log("设备连接成功");
            that.getBLEServiceId(deviceId);
          },
          fail: function (res) {
            console.log("设备连接失败" + res.errMsg);
          }
        })
      }, 2000)
    });
  },

  //获取服务UUID
  getBLEServiceId: function(deviceId){
    console.log("获取设备[" + deviceId + "]服务列表")
    var that = this;
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: function(res) {
        console.log(res);
        var services = res.services;
        if (services.length <= 0){
          console.log("未找到主服务列表")
          return;
        }
        console.log('找到设备服务列表个数: ' + services.length);
        if (services.length == 1){
          var service = services[0];
          console.log("服务UUID:["+service.uuid+"] Primary:" + service.isPrimary);
          that.getBLECharactedId(deviceId, service.uuid);
        }else{ //多个主服务
          //TODO
          var service = services[0];
          that.getBLECharactedId(deviceId, service.uuid);

        }
      },
      fail: function(res){
        console.log("获取设备服务列表失败" + res.errMsg);
      }
    })
  },

  // 获取服务下的特征值（由于这个例子，是包含两个特征值，一个用于读，一个用于写，实际项目，跟上面的服务一样，要定义好特征量UUID的规则
  getBLECharactedId: function(deviceId, serviceId){
    console.log("获取设备特征值")
    var that = this;
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: function(res) {
        console.log(res);
        //这里会获取到两个特征值，一个用来写，一个用来读
        var chars = res.characteristics;
        if(chars.length <= 0){
          console.log("未找到设备特征值")
          return ;
        }
        console.log("找到设备特征值个数:" + chars.length);
        if(chars.length == 2){
          for(var i=0; i<chars.length; i++){
            var char = chars[i];
            console.log("特征值[" + char.uuid + "]")
            var prop = char.properties;
            if(prop.notify == true){
              console.log("该特征值属性: Notify");
              that.recvBLECharacterNotice(deviceId, serviceId, char.uuid);
            }else if(prop.write == true){
              console.log("该特征值属性: Write");
              that.sendBLECharacterNotice(deviceId, serviceId, char.uuid);
            }else{
              console.log("该特征值属性: 其他");
            }
          }
        }else{
          //TODO
        }
      },
      fail: function(res){
        console.log("获取设备特征值失败")
      }
    })
  },
// recv 接收设备发送过来数据
  recvBLECharacterNotice: function(deviceId, serviceId, charId){
    //接收设置是否成功
    console.log("注册Notice 回调函数");
    var that = this;
    wx.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: charId,
      state: true, //启用Notify功能
      success: function(res) {
        wx.onBLECharacteristicValueChange(function(res){
          console.log(res);
          console.log("收到Notify数据: " + that.ab2hex(res.value));
          //关闭蓝牙
          wx.showModal({
            title: '配网成功',
            content: that.ab2hex(res.value),
            showCancel: false
          })
        });
      },
      fail: function(res){
        console.log(res);
        console.log("特征值Notice 接收数据失败: " + res.errMsg);
      }
    })
  },

  // send 小程序发送数据到设备
  sendBLECharacterNotice: function (deviceId, serviceId, charId){
    //发送ssid/pass
    console.log("延时1秒后，发送SSID/PASS");
    var that = this;
    var cell = {
      "ssid": this.data.ssid,
      "pass": this.data.pass
    }
    var buffer = this.string2buffer(JSON.stringify(cell));
    setTimeout(function(){
      wx.writeBLECharacteristicValue({
        deviceId: deviceId,
        serviceId: serviceId,
        characteristicId: charId,
        value: buffer,
        success: function(res) {
          console.log("发送SSID/PASS 成功");
        },
        fail: function(res){
          console.log(res);
          console.log("发送失败." + res.errMsg);
        },
        complete: function(){
          
        }
      })
      
    }, 1000);
  },
  closeBLE: function(deviceId, callback){
    var that = this;
    wx.closeBLEConnection({
      deviceId: deviceId,
      success: function(res) {
        console.log("断开设备[" + deviceId + "]成功.");
        console.log(res)
      },
      fail: function(res){
        console.log("断开设备成功.");
      },
      complete: callback
    })
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})