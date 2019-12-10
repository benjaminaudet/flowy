let flowy = function (canvas, grab, release, snapping, spacingX, spacingY) {
  if (!grab) {
    grab = function () { };
  }
  if (!release) {
    release = function () { };
  }
  if (!snapping) {
    snapping = function () {
      return true;
    };
  }
  if (!spacingX) {
    spacingX = 20;
  }
  if (!spacingY) {
    spacingY = 80;
  }

  $(document).ready(function (event) {
    let blocks = [];
    let blocksTemp = [];
    let $canvasDiv = canvas;
    let active = false;
    let paddingX = spacingX;
    let paddingY = spacingY;
    let offsetLeft = 0;
    let offsetLeftOld = 0;
    let rearrange = false;
    let lastEvent = false;
    let drag, dragX, dragY, original;
    let mouseX, mouseY;

    $canvasDiv.append("<div class='indicator invisible'></div>");

    flowy.import = function (output) {
      $canvasDiv.html(JSON.parse(output.html));
      blocks = output.blockarr;
    }

    flowy.export = function () {
      let htmlSer = JSON.stringify($canvasDiv.html());
      let jsonData = { html: htmlSer, blockarr: blocks, blocks: [] };
      if (blocks.length > 0) {
        for (let i = 0; i < blocks.length; i++) {
          jsonData.blocks.push({
            id: blocks[i].id,
            parent: blocks[i].parent,
            data: [],
            attr: []
          });

          $(`.blockid[value=${blocks[i].id}]`).parent().find("input").each(function () {
            let jsonName = $(this).attr("name");
            let jsonValue = $(this).val();
            jsonData.blocks[i].data.push({
              name: jsonName,
              value: jsonValue
            });
          });

          $.each($(`.blockid[value=${blocks[i].id}]`).parent()[0].attributes, (index, attribute) => {
            let jsonObj = {};
            jsonObj[attribute.name] = attribute.value;
            jsonData.blocks[i].attr.push(jsonObj);
          });
        }
        return jsonData;
      }
    }

    flowy.deleteBlocks = function () {
      blocks = [];
      $canvasDiv.html("<div class='indicator invisible'></div>");
    }

    $(document).on("mousedown touchstart", ".create-flowy", function (event) {
      if (event.targetTouches) {
        mouseX = event.changedTouches[0].clientX;
        mouseY = event.changedTouches[0].clientY;
      } else {
        mouseX = event.clientX;
        mouseY = event.clientY;
      }

      if (event.which != 3) {
        $original = $(this);
        if (blocks.length == 0) {
          $(this).clone().addClass('block').append(`<input type='hidden' name='blockid' class='blockid' value=${blocks.length}>`).removeClass("create-flowy").appendTo("body");
          $(this).addClass("dragnow");
          $drag = $(`.blockid[value=${blocks.length}]`).parent();
        } else {
          $(this).clone().addClass('block').append(`<input type='hidden' name='blockid' class='blockid' value='${Math.max.apply(Math, blocks.map(a => a.id)) + 1}'>`).removeClass("create-flowy").appendTo("body");
          $(this).addClass("dragnow");
          $drag = $(`.blockid[value=${parseInt(Math.max.apply(Math, blocks.map(a => a.id))) + 1}]`).parent();
        }
        blockGrabbed($(this));
        $drag.addClass("dragging");
        active = true;
        dragX = mouseX - $(this).offset().left;
        dragY = mouseY - $(this).offset().top;
        $drag.css("left", `${mouseX - dragX}px`);
        $drag.css("top", `${mouseY - dragY}px`);
      }
    });

    $(document).on("mouseup touchend", function (event) {
      if (event.which != 3 && (active || rearrange)) {
        blockReleased();
        if (!$(".indicator").hasClass("invisible")) {
          $(".indicator").addClass("invisible");
        }
        if (active) {
          $original.removeClass("dragnow");
          $drag.removeClass("dragging");
        }

        if (parseInt($drag.children(".blockid").val()) == 0 && rearrange) {
          $drag.removeClass("dragging");
          rearrange = false;
          for (let w = 0; w < blocksTemp.length; w++) {
            if (blocksTemp[w].id != parseInt($drag.children(".blockid").val())) {
              $(`.blockid[value=${blocksTemp[w].id}]`).parent().css("left", $(`.blockid[value=${blocksTemp[w].id}]`).parent().offset().left - $canvasDiv.offset().left + $canvasDiv.scrollLeft());
              $(`.blockid[value=${blocksTemp[w].id}]`).parent().css("top", $(`.blockid[value=${blocksTemp[w].id}]`).parent().offset().top - $canvasDiv.offset().top + $canvasDiv.scrollTop());
              $(`.arrowid[value=${blocksTemp[w].id}]`).parent().css("left", $(`.arrowid[value=${blocksTemp[w].id}]`).parent().offset().left - $canvasDiv.offset().left + $canvasDiv.scrollLeft());
              $(`.arrowid[value=${blocksTemp[w].id}]`).parent().css("top", `${$(`.arrowid[value=${blocksTemp[w].id}]`).parent().offset().top - $canvasDiv.offset().top + $canvasDiv.scrollTop()}px`);
              $(`.blockid[value=${blocksTemp[w].id}]`).parent().appendTo($canvasDiv);
              $(`.arrowid[value=${blocksTemp[w].id}]`).parent().appendTo($canvasDiv);

              blocksTemp[w].x = $(`.blockid[value=${blocksTemp[w].id}]`).parent().offset().left + ($(`.blockid[value=${blocksTemp[w].id}]`).innerWidth() / 2) + $canvasDiv.scrollLeft();
              blocksTemp[w].y = $(`.blockid[value=${blocksTemp[w].id}]`).parent().offset().top + ($(`.blockid[value=${blocksTemp[w].id}]`).parent().innerHeight() / 2) + $canvasDiv.scrollTop();

            }
          }
          blocksTemp.filter(a => a.id == 0)[0].x = $drag.offset().left + ($drag.innerWidth() / 2);
          blocksTemp.filter(a => a.id == 0)[0].y = $drag.offset().top + ($drag.innerHeight() / 2);
          blocks = $.merge(blocks, blocksTemp);
          blocksTemp = [];
        } else if (active && blocks.length == 0 && $drag.offset().top > $canvasDiv.offset().top && $drag.offset().left > $canvasDiv.offset().left) {
          blockSnap($drag, true, undefined);
          active = false;
          $drag.css("top", `${$drag.offset().top - $canvasDiv.offset().top + $canvasDiv.scrollTop()}px`);
          $drag.css("left", `${$drag.offset().left - $canvasDiv.offset().left + $canvasDiv.scrollLeft()}px`);
          $drag.appendTo($canvasDiv);
          blocks.push({
            parent: -1,
            childWidth: 0,
            id: parseInt($drag.children(".blockid").val()),
            x: $drag.offset().left + ($drag.innerWidth() / 2) + $canvasDiv.scrollLeft(),
            y: $drag.offset().top + ($drag.innerHeight() / 2) + $canvasDiv.scrollTop(),
            width: $drag.innerWidth(),
            height: $drag.innerHeight()
          });
        } else if (active && blocks.length == 0) {
          $drag.remove();
        } else if (active || rearrange) {
          let xPos = $drag.offset().left + ($drag.innerWidth() / 2) + $canvasDiv.scrollLeft();
          let yPos = $drag.offset().top + $canvasDiv.scrollTop();
          let blocko = blocks.map(a => a.id);
          for (let i = 0; i < blocks.length; i++) {
            if (xPos >= blocks.filter(a => a.id == blocko[i])[0].x - (blocks.filter(a => a.id == blocko[i])[0].width / 2) - paddingX && xPos <= blocks.filter(a => a.id == blocko[i])[0].x + (blocks.filter(a => a.id == blocko[i])[0].width / 2) + paddingX && yPos >= blocks.filter(a => a.id == blocko[i])[0].y - (blocks.filter(a => a.id == blocko[i])[0].height / 2) && yPos <= blocks.filter(a => a.id == blocko[i])[0].y + blocks.filter(a => a.id == blocko[i])[0].height) {
              active = false;
              if (!rearrange && blockSnap($drag, false, blocks.filter(id => id.id == blocko[i])[0])) {
                snap(drag, i, blocko);
              } else if (rearrange) {
                snap(drag, i, blocko);
              }
              break;
            } else if (i == blocks.length - 1) {
              if (rearrange) {
                rearrange = false;
                blocksTemp = [];
              }
              active = false;
              $drag.remove();
            }
          }
        }
      }
    });

    function snap(drag, i, blocko) {
      if (!rearrange) {
        $drag.appendTo($canvasDiv);
      }
      let totalWidth = 0;
      let totalRemove = 0;
      let maxHeight = 0;
      for (let w = 0; w < blocks.filter(id => id.parent == blocko[i]).length; w++) {
        let children = blocks.filter(id => id.parent == blocko[i])[w];
        if (children.childWidth > children.width) {
          totalWidth += children.childWidth + paddingX;
        } else {
          totalWidth += children.width + paddingX;
        }
      }
      totalWidth += $drag.innerWidth();
      for (let w = 0; w < blocks.filter(id => id.parent == blocko[i]).length; w++) {
        let children = blocks.filter(id => id.parent == blocko[i])[w];
        if (children.childWidth > children.width) {
          $(`.blockid[value=${children.id}]`).parent().css("left", `${blocks.filter(a => a.id == blocko[i])[0].x - (totalWidth / 2) + totalRemove + (children.childWidth / 2) - (children.width / 2)}px`);
          children.x = blocks.filter(id => id.parent == blocko[i])[0].x - (totalWidth / 2) + totalRemove + (children.childWidth / 2);
          totalRemove += children.childWidth + paddingX;
        } else {
          $(`.blockid[value=${children.id}]`).parent().css("left", `${blocks.filter(a => a.id == blocko[i])[0].x - (totalWidth / 2) + totalRemove}px`);
          children.x = blocks.filter(id => id.parent == blocko[i])[0].x - (totalWidth / 2) + totalRemove + (children.width / 2);
          totalRemove += children.width + paddingX;
        }
      }
      $drag.css("left", `${blocks.filter(id => id.id == blocko[i])[0].x - (totalWidth / 2) + totalRemove - $canvasDiv.offset().left + $canvasDiv.scrollLeft()}px`);
      $drag.css("top", `${blocks.filter(id => id.id == blocko[i])[0].y + (blocks.filter(id => id.id == blocko[i])[0].height / 2) + paddingY - $canvasDiv.offset().top}px`);
      if (rearrange) {
        blocksTemp.filter(a => a.id == parseInt($drag.children(".blockid").val()))[0].x = $drag.offset().left + ($drag.innerWidth() / 2) + $canvasDiv.scrollLeft() + $canvasDiv.scrollLeft();
        blocksTemp.filter(a => a.id == parseInt($drag.children(".blockid").val()))[0].y = $drag.offset().top + ($drag.innerHeight() / 2) + $canvasDiv.scrollTop();
        blocksTemp.filter(a => a.id == $drag.children(".blockid").val())[0].parent = blocko[i];
        for (let w = 0; w < blocksTemp.length; w++) {
          if (blocksTemp[w].id != parseInt($drag.children(".blockid").val())) {
            $(`.blockid[value=${blocksTemp[w].id}]`).parent().css("left", $(`.blockid[value=${blocksTemp[w].id}]`).parent().offset().left - $canvasDiv.offset().left + $canvasDiv.scrollLeft());
            $(`.blockid[value=${blocksTemp[w].id}]`).parent().css("top", $(`.blockid[value=${blocksTemp[w].id}]`).parent().offset().top - $canvasDiv.offset().top + $canvasDiv.scrollTop());
            $(`.arrowid[value=${blocksTemp[w].id}]`).parent().css("left", $(`.arrowid[value=${blocksTemp[w].id}]`).parent().offset().left - $canvasDiv.offset().left + $canvasDiv.scrollLeft() + 20);
            $(`.arrowid[value=${blocksTemp[w].id}]`).parent().css("top", $(`.arrowid[value=${blocksTemp[w].id}]`).parent().offset().top - $canvasDiv.offset().top + $canvasDiv.scrollTop());
            $(`.blockid[value=${blocksTemp[w].id}]`).parent().appendTo($canvasDiv);
            $(`.arrowid[value=${blocksTemp[w].id}]`).parent().appendTo($canvasDiv);

            blocksTemp[w].x = $(`.blockid[value=${blocksTemp[w].id}]`).parent().offset().left + ($(`.blockid[value=${blocksTemp[w].id}]`).innerWidth() / 2) + $canvasDiv.scrollLeft();
            blocksTemp[w].y = $(`.blockid[value=${blocksTemp[w].id}]`).parent().offset().top + ($(`.blockid[value=${blocksTemp[w].id}]`).parent().innerHeight() / 2) + $canvasDiv.scrollTop();

          }
        }
        blocks = $.merge(blocks, blocksTemp);
        blocksTemp = [];
      } else {
        blocks.push({
          childWidth: 0,
          parent: blocko[i],
          id: parseInt($drag.children(".blockid").val()),
          x: $drag.offset().left + ($drag.innerWidth() / 2) + $canvasDiv.scrollLeft(),
          y: $drag.offset().top + ($drag.innerHeight() / 2) + $canvasDiv.scrollTop(),
          width: $drag.innerWidth(),
          height: $drag.innerHeight()
        });
      }
      let arrowHelp = blocks.filter(a => a.id == parseInt($drag.children(".blockid").val()))[0];
      let arrowX = arrowHelp.x - blocks.filter(a => a.id == blocko[i])[0].x + 20;
      let arrowy = arrowHelp.y - (arrowHelp.height / 2) - (blocks.filter(id => id.parent == blocko[i])[0].y + (blocks.filter(id => id.parent == blocko[i])[0].height / 2)) + $canvasDiv.scrollTop();
      if (arrowX < 0) {
        $drag.after(`<div class="arrowblock"><input type="hidden" class="arrowid" value="${$drag.children(".blockid").val()}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${blocks.filter(a => a.id == blocko[i])[0].x - arrowHelp.x + 5} 0L${blocks.filter(a => a.id == blocko[i])[0].x - arrowHelp.x + 5} ${paddingY / 2}L5 ${paddingY / 2}L5 ${arrowy}" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ${arrowy - 5}H10L5 ${arrowy}L0 ${arrowy - 5}Z" fill="#C5CCD0"/></svg></div>`);
        $(`.arrowid[value=${$drag.children(".blockid").val()}]`).parent().css("left", `${(arrowHelp.x - 5) - $canvasDiv.offset().left + $canvasDiv.scrollLeft()}px`);
      } else {
        $drag.after(`<div class="arrowblock"><input type="hidden" class="arrowid" value="${$drag.children(".blockid").val()}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ${paddingY / 2}L${arrowX} ${paddingY / 2}L${arrowX} ${arrowy}" stroke="#C5CCD0" stroke-width="2px"/><path d="M${arrowX - 5} ${arrowy - 5}H${arrowX + 5}L${arrowX} ${arrowy}L${arrowX - 5} ${arrowy - 5}Z" fill="#C5CCD0"/></svg></div>`);
        $(`.arrowid[value=${parseInt($drag.children(".blockid").val())}]`).parent().css("left", `${blocks.filter(a => a.id == blocko[i])[0].x - 20 - $canvasDiv.offset().left + $canvasDiv.scrollLeft()}px`);
      }
      $(`.arrowid[value=${parseInt($drag.children(".blockid").val())}]`).parent().css("top", `${blocks.filter(a => a.id == blocko[i])[0].y + (blocks.filter(a => a.id == blocko[i])[0].height / 2)}px`);
      if (blocks.filter(a => a.id == blocko[i])[0].parent != -1) {
        let flag = false;
        let idval = blocko[i];
        while (!flag) {
          if (blocks.filter(a => a.id == idval)[0].parent == -1) {
            flag = true;
          } else {
            let zwidth = 0;
            for (let w = 0; w < blocks.filter(id => id.parent == idval).length; w++) {
              let children = blocks.filter(id => id.parent == idval)[w];
              if (children.childWidth > children.width) {
                if (w == blocks.filter(id => id.parent == idval).length - 1) {
                  zwidth += children.childWidth;
                } else {
                  zwidth += children.childWidth + paddingX;
                }
              } else {
                if (w == blocks.filter(id => id.parent == idval).length - 1) {
                  zwidth += children.width;
                } else {
                  zwidth += children.width + paddingX;
                }
              }
            }
            blocks.filter(a => a.id == idval)[0].childWidth = zwidth;
            idval = blocks.filter(a => a.id == idval)[0].parent;
          }
        }
        blocks.filter(id => id.id == idval)[0].childWidth = totalWidth;
      }
      if (rearrange) {
        rearrange = false;
        $drag.removeClass("dragging");
      }
      rearrangeMe();
      checkOffset();
    }

    $(document).on("mousedown touchstart", ".block", function (event) {
      $(document).on("mouseup mousemove touchmove", ".block", function handler(event) {
        if (event.targetTouches) {
          mouseX = event.targetTouches[0].clientX;
          mouseY = event.targetTouches[0].clientY;
        } else {
          mouseX = event.clientX;
          mouseY = event.clientY;
        }
        if (event.type !== "mouseup") {
          if (event.which != 3) {
            if (!active && !rearrange) {
              rearrange = true;
              $drag = $(this);
              $drag.addClass("dragging");
              dragX = mouseX - $(this).offset().left;
              dragY = mouseY - $(this).offset().top;
              let blockid = parseInt($(this).children(".blockid").val());
              $drag = $(this);
              blocksTemp.push(blocks.filter(a => a.id == blockid)[0]);
              blocks = $.grep(blocks, function (e) {
                return e.id != blockid
              });
              $(`.arrowid[value=${blockid}]`).parent().remove();
              let layer = blocks.filter(a => a.parent == blockid);
              let flag = false;
              let foundIds = [];
              let allIds = [];
              while (!flag) {
                for (let i = 0; i < layer.length; i++) {
                  blocksTemp.push(blocks.filter(a => a.id == layer[i].id)[0]);
                  $(`.blockid[value=${layer[i].id}]`).parent().css("left", $(`.blockid[value=${layer[i].id}]`).parent().offset().left - $drag.offset().left);
                  $(`.blockid[value=${layer[i].id}]`).parent().css("top", $(`.blockid[value=${layer[i].id}]`).parent().offset().top - $drag.offset().top);
                  $(`.arrowid[value=${layer[i].id}]`).parent().css("left", $(`.arrowid[value=${layer[i].id}]`).parent().offset().left - $drag.offset().left);
                  $(`.arrowid[value=${layer[i].id}]`).parent().css("top", $(`.arrowid[value=${layer[i].id}]`).parent().offset().top - $drag.offset().top);
                  $(`.blockid[value=${layer[i].id}]`).parent().appendTo(drag);
                  $(`.arrowid[value=${layer[i].id}]`).parent().appendTo(drag);
                  foundIds.push(layer[i].id);
                  allIds.push(layer[i].id);
                }
                if (foundIds.length == 0) {
                  flag = true;
                } else {
                  layer = blocks.filter(a => foundIds.includes(a.parent));
                  foundIds = [];
                }
              }
              for (let i = 0; i < blocks.filter(a => a.parent == blockid).length; i++) {
                let blockNumber = blocks.filter(a => a.parent == blockid)[i];
                blocks = $.grep(blocks, function (e) {
                  return e.id != blockNumber
                });
              }
              for (let i = 0; i < allIds.length; i++) {
                let blockNumber = allIds[i];
                blocks = $.grep(blocks, function (e) {
                  return e.id != blockNumber
                });
              }
              if (blocks.length > 1) {
                rearrangeMe();
              }
              if (lastEvent) {
                fixOffset();
              }
            }
          }
        }
        $(document).off("mouseup mousemove touchmove", handler);
      });
    });

    $(document).on("mousemove touchmove", function (event) {
      if (event.targetTouches) {
        mouseX = event.targetTouches[0].clientX;
        mouseY = event.targetTouches[0].clientY;
      } else {
        mouseX = event.clientX;
        mouseY = event.clientY;
      }

      if (active) {
        $drag.css("left", `${mouseX - dragX}px`);
        $drag.css("top", `${mouseY - dragY}px`);
      } else if (rearrange) {
        $drag.css("left", `${mouseX - dragX - $canvasDiv.offset().left + $canvasDiv.scrollLeft()}px`);
        $drag.css("top", `${mouseY - dragY - $canvasDiv.offset().top + $canvasDiv.scrollTop()}px`);
        blocksTemp.filter(a => a.id == parseInt($drag.children(".blockid").val())).x = $drag.offset().left + ($drag.innerWidth() / 2) + $canvasDiv.scrollLeft();
        blocksTemp.filter(a => a.id == parseInt($drag.children(".blockid").val())).y = $drag.offset().left + ($drag.innerHeight() / 2) + $canvasDiv.scrollTop();
      }

      if (active || rearrange) {
        let xPos = $drag.offset().left + ($drag.innerWidth() / 2) + $canvasDiv.scrollLeft();
        let yPos = $drag.offset().top + $canvasDiv.scrollTop();
        let blocko = blocks.map(a => a.id);
        for (let i = 0; i < blocks.length; i++) {
          if (xPos >= blocks.filter(a => a.id == blocko[i])[0].x - (blocks.filter(a => a.id == blocko[i])[0].width / 2) - paddingX && xPos <= blocks.filter(a => a.id == blocko[i])[0].x + (blocks.filter(a => a.id == blocko[i])[0].width / 2) + paddingX && yPos >= blocks.filter(a => a.id == blocko[i])[0].y - (blocks.filter(a => a.id == blocko[i])[0].height / 2) && yPos <= blocks.filter(a => a.id == blocko[i])[0].y + blocks.filter(a => a.id == blocko[i])[0].height) {
            $(".indicator").appendTo($(`.blockid[value=${blocko[i]}]`).parent());
            $(".indicator").css("left", `${($(`.blockid[value=${blocko[i]}]`).parent().innerWidth() / 2) - 5}px`);
            $(".indicator").css("top", `${$(`.blockid[value=${blocko[i]}]`).parent().innerHeight()}px`);
            $(".indicator").removeClass("invisible");
            break;
          } else if (i == blocks.length - 1) {
            if (!$(".indicator").hasClass("invisible")) {
              $(".indicator").addClass("invisible");
            }
          }
        }
      }
    })

    function checkOffset() {
      offsetLeft = blocks.map(a => a.x);
      let widths = blocks.map(a => a.width);
      let mathMin = offsetLeft.map(function (item, index) {
        return item - (widths[index] / 2);
      })
      offsetLeft = Math.min.apply(Math, mathMin);
      if (offsetLeft < $canvasDiv.offset().left) {
        lastEvent = true;
        let blocko = blocks.map(a => a.id);
        for (let w = 0; w < blocks.length; w++) {
          $(`.blockid[value=${blocks.filter(a => a.id == blocko[w])[0].id}]`).parent().css("left", blocks.filter(a => a.id == blocko[w])[0].x - (blocks.filter(a => a.id == blocko[w])[0].width / 2) - offsetLeft + 20);
          if (blocks.filter(a => a.id == blocko[w])[0].parent != -1) {
            let arrowHelp = blocks.filter(a => a.id == blocko[w])[0];
            let arrowX = arrowHelp.x - blocks.filter(a => a.id == blocks.filter(a => a.id == blocko[w])[0].parent)[0].x;
            if (arrowX < 0) {
              $(`.arrowid[value=${blocko[w]}]`).parent().css("left", `${arrowHelp.x - offsetLeft + 20 - 5}px`);
            } else {
              $(`.arrowid[value=${blocko[w]}]`).parent().css("left", `${blocks.filter(id => id.id == blocks.filter(a => a.id == blocko[w])[0].parent)[0].x - 20 - offsetLeft + 20}px`);
            }
          }
        }
        for (let w = 0; w < blocks.length; w++) {
          blocks[w].x = $(`.blockid[value=${blocks[w].id}]`).parent().offset().left + $canvasDiv.offset().left - ($(`.blockid[value=${blocks[w].id}]`).parent().innerWidth() / 2) - 40;
        }
        offsetLeftOld = offsetLeft;
      }
    }

    function fixOffset() {
      if (offsetLeftOld < $canvasDiv.offset().left) {
        lastEvent = false;
        let blocko = blocks.map(a => a.id);
        for (let w = 0; w < blocks.length; w++) {
          $(`.blockid[value=${blocks.filter(a => a.id == blocko[w])[0].id}]`).parent().css("left", blocks.filter(a => a.id == blocko[w])[0].x - (blocks.filter(a => a.id == blocko[w])[0].width / 2) - offsetLeftOld - 20);
          blocks.filter(a => a.id == blocko[w])[0].x = $(`.blockid[value=${blocks.filter(a => a.id == blocko[w])[0].id}]`).parent().offset().left + (blocks.filter(a => a.id == blocko[w])[0].width / 2);

          if (blocks.filter(a => a.id == blocko[w])[0].parent != -1) {
            let arrowHelp = blocks.filter(a => a.id == blocko[w])[0];
            let arrowX = arrowHelp.x - blocks.filter(a => a.id == blocks.filter(a => a.id == blocko[w])[0].parent)[0].x;
            if (arrowX < 0) {
              $(`.arrowid[value=${blocko[w]}]`).parent().css("left", `${arrowHelp.x - 5 - $canvasDiv.offset().left}px`);
            } else {
              $(`.arrowid[value=${blocko[w]}]`).parent().css("left", `${blocks.filter(id => id.id == blocks.filter(a => a.id == blocko[w])[0].parent)[0].x - 20 - $canvasDiv.offset().left}px`);
            }
          }
        }
        for (let w = 0; w < blocks.length; w++) {
          //blocks[w].x = blocks[w].x+offsetLeftOld-20;
        }
        offsetLeftOld = 0;
      }
    }

    function rearrangeMe() {
      let result = blocks.map(a => a.parent);
      for (let z = 0; z < result.length; z++) {
        if (result[z] == -1) {
          z++;
        }
        let totalWidth = 0;
        let totalRemove = 0;
        let maxHeight = 0;

        for (let w = 0; w < blocks.filter(id => id.parent == result[z]).length; w++) {
          let children = blocks.filter(id => id.parent == result[z])[w];
          if (blocks.filter(id => id.parent == children.id).length == 0) {
            children.childWidth = 0;
          }
          if (children.childWidth > children.width) {
            if (w == blocks.filter(id => id.parent == result[z]).length - 1) {
              totalWidth += children.childWidth;
            } else {
              totalWidth += children.childWidth + paddingX;
            }
          } else {
            if (w == blocks.filter(id => id.parent == result[z]).length - 1) {
              totalWidth += children.width;
            } else {
              totalWidth += children.width + paddingX;
            }
          }
        }

        if (result[z] != -1) {
          blocks.filter(a => a.id == result[z])[0].childWidth = totalWidth;
        }

        for (let w = 0; w < blocks.filter(id => id.parent == result[z]).length; w++) {
          let children = blocks.filter(id => id.parent == result[z])[w];
          $(`.blockid[value=${children.id}]`).parent().css("top", `${blocks.filter(id => id.id == result[z]).y + paddingY}px`);
          blocks.filter(id => id.id == result[z]).y = blocks.filter(id => id.id == result[z]).y + paddingY;
          if (children.childWidth > children.width) {
            $(`.blockid[value=${children.id}]`).parent().css("left", `${blocks.filter(id => id.id == result[z])[0].x - (totalWidth / 2) + totalRemove + (children.childWidth / 2) - (children.width / 2) - $canvasDiv.offset().left}px`);
            children.x = blocks.filter(id => id.id == result[z])[0].x - (totalWidth / 2) + totalRemove + (children.childWidth / 2);
            totalRemove += children.childWidth + paddingX;
          } else {
            $(`.blockid[value=${children.id}]`).parent().css("left", `${blocks.filter(id => id.id == result[z])[0].x - (totalWidth / 2) + totalRemove - $canvasDiv.offset().left}px`);
            children.x = blocks.filter(id => id.id == result[z])[0].x - (totalWidth / 2) + totalRemove + (children.width / 2);
            totalRemove += children.width + paddingX;
          }
          let arrowHelp = blocks.filter(a => a.id == children.id)[0];
          let arrowX = arrowHelp.x - blocks.filter(a => a.id == children.parent)[0].x + 20;
          let arrowy = arrowHelp.y - (arrowHelp.height / 2) - (blocks.filter(a => a.id == children.parent)[0].y + (blocks.filter(a => a.id == children.parent)[0].height / 2));
          $(`.arrowid[value=${children.id}]`).parent().css("top", `${blocks.filter(id => id.id == children.parent)[0].y + (blocks.filter(id => id.id == children.parent)[0].height / 2) - $canvasDiv.offset().top}px`);
          if (arrowX < 0) {
            $(`.arrowid[value=${children.id}]`).parent().css("left", `${(arrowHelp.x - 5) - $canvasDiv.offset().left}px`);
            $(`.arrowid[value=${children.id}]`).parent().html(`<input type="hidden" class="arrowid" value="${children.id}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${blocks.filter(id => id.id == children.parent)[0].x - arrowHelp.x + 5} 0L${blocks.filter(id => id.id == children.parent)[0].x - arrowHelp.x + 5} ${paddingY / 2}L5 ${paddingY / 2}L5 ${arrowy}" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ${arrowy - 5}H10L5 ${arrowy}L0 ${arrowy - 5}Z" fill="#C5CCD0"/></svg>`);
          } else {
            $(`.arrowid[value=${children.id}]`).parent().css("left", `${blocks.filter(id => id.id == children.parent)[0].x - 20 - $canvasDiv.offset().left}px`);
            $(`.arrowid[value=${children.id}]`).parent().html(`<input type="hidden" class="arrowid" value="${children.id}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ${paddingY / 2}L${arrowX} ${paddingY / 2}L${arrowX} ${arrowy}" stroke="#C5CCD0" stroke-width="2px"/><path d="M${arrowX - 5} ${arrowy - 5}H${arrowX + 5}L${arrowX} ${arrowy}L${arrowX - 5} ${arrowy - 5}Z" fill="#C5CCD0"/></svg>`);
          }
        }
      }
    }
  });

  function blockGrabbed(block) {
    grab(block);
  }

  function blockReleased() {
    release();
  }

  function blockSnap(drag, first, parent) {
    return snapping(drag, first, parent);
  }
}
